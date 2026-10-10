import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { readStripeConfig } from "@/lib/stripe/config";
import { buildCheckoutSessionParams, idempotencyKeyFor } from "@/lib/stripe/checkout";
import { handleStripeWebhook, type StripeLike } from "@/lib/stripe/webhook";
import { MemoryEventLedger } from "@/lib/stripe/ledger";
import { priceBasket } from "@/lib/pricing/basket";
import { mugLine } from "./helpers";

// Obviously fake, never a real key. Signing uses Stripe's own SDK helper, offline.
const TEST_KEY = "sk_test_unit000000000000000000";
const WEBHOOK_SECRET = "whsec_unit_test_secret_000000000000";
const sdk = new Stripe(TEST_KEY);

describe("Stripe configuration guard", () => {
  it("disables checkout when keys are missing", () => {
    expect(readStripeConfig({})).toEqual({ mode: "disabled", reason: "missing" });
  });
  it("refuses live keys outright", () => {
    expect(readStripeConfig({ STRIPE_SECRET_KEY: "sk_live_abc123" })).toEqual({ mode: "disabled", reason: "live_key_refused" });
    expect(readStripeConfig({ STRIPE_SECRET_KEY: "rk_live_abc123" })).toEqual({ mode: "disabled", reason: "live_key_refused" });
  });
  it("accepts test keys and only well-formed webhook secrets", () => {
    expect(readStripeConfig({ STRIPE_SECRET_KEY: TEST_KEY, STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET })).toEqual({ mode: "test", secretKey: TEST_KEY, webhookSecret: WEBHOOK_SECRET });
    expect(readStripeConfig({ STRIPE_SECRET_KEY: TEST_KEY, STRIPE_WEBHOOK_SECRET: "nope" })).toMatchObject({ webhookSecret: null });
    expect(readStripeConfig({ STRIPE_SECRET_KEY: "pk_test_abc" })).toEqual({ mode: "disabled", reason: "invalid_key" });
  });
});

describe("Checkout Session params are built from server prices only", () => {
  const basket = priceBasket([mugLine({ qty: 3 }), mugLine({ id: "line-test-0002", variantId: "15oz", placementId: "both", qty: 1, design: { widthMm: 60, offsetYmm: 0 } })], "checkout");

  it("uses catalogue unit amounts, GBP, UK shipping and test metadata", () => {
    const params = buildCheckoutSessionParams(basket, "https://preview.example");
    expect(params.mode).toBe("payment");
    expect(params.ui_mode).toBe("hosted_page");
    expect(params.line_items?.map((l) => [l.quantity, l.price_data?.unit_amount, l.price_data?.currency])).toEqual([
      [3, 1400, "gbp"],
      [1, 1600, "gbp"],
    ]);
    expect(params.shipping_options?.[0].shipping_rate_data?.fixed_amount?.amount).toBe(495);
    expect(params.shipping_address_collection?.allowed_countries).toEqual(["GB"]);
    expect(params.metadata?.nota_mode).toBe("test");
    expect(params.metadata?.nota_fulfilment).toBe("dry_run");
    expect(params.success_url).toBe("https://preview.example/checkout/success?session_id={CHECKOUT_SESSION_ID}");
    expect(JSON.stringify(params)).not.toContain("payment_method_types");
  });

  it("refuses to build a session for invalid baskets", () => {
    const bad = priceBasket([mugLine({ colourId: "black" })], "checkout");
    expect(() => buildCheckoutSessionParams(bad, "https://x")).toThrow(/validation errors/);
  });

  it("derives a stable idempotency key from basket contents", () => {
    expect(idempotencyKeyFor(basket)).toBe(idempotencyKeyFor(priceBasket([mugLine({ qty: 3 }), mugLine({ id: "line-test-0002", variantId: "15oz", placementId: "both", qty: 1, design: { widthMm: 60, offsetYmm: 0 } })], "checkout")));
    expect(idempotencyKeyFor(basket)).not.toBe(idempotencyKeyFor(priceBasket([mugLine({ qty: 4 })], "checkout")));
  });
});

function fakeStripe() {
  const metadata: Record<string, Record<string, string>> = {};
  const update = vi.fn(async (id: string, params: { metadata: Record<string, string> }, _options?: { idempotencyKey?: string }) => {
    metadata[id] = { ...(metadata[id] ?? {}), ...params.metadata };
    return {};
  });
  const retrieve = vi.fn(async (id: string) => ({ id, metadata: metadata[id] ?? {} }));
  const client: StripeLike = { webhooks: sdk.webhooks, paymentIntents: { retrieve, update } };
  return { client, update, retrieve, metadata };
}

function signedEvent(event: Record<string, unknown>, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  return { payload, header: sdk.webhooks.generateTestHeaderString({ payload, secret }) };
}

const paidSession = (overrides: Record<string, unknown> = {}) => ({
  id: "evt_test_paid_1",
  object: "event",
  livemode: false,
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_123",
      object: "checkout.session",
      payment_status: "paid",
      payment_intent: "pi_test_123",
      metadata: { nota_lines: "1", nota_l0: "mug|1320|11 oz|Front|2|a1b2c3d4e5f60718|50|0", nota_order_ref: "NP-ABCDEF12" },
      customer_details: { address: { country: "GB" } },
    },
  },
  ...overrides,
});

describe("Stripe webhook: signed, idempotent, dry-run only", () => {
  const config = { mode: "test" as const, secretKey: TEST_KEY, webhookSecret: WEBHOOK_SECRET };

  it("returns 503 when not configured and never processes anything", async () => {
    const { payload, header } = signedEvent(paidSession());
    const res = await handleStripeWebhook(payload, header, { config: { mode: "disabled", reason: "missing" }, stripe: null, ledger: new MemoryEventLedger() });
    expect(res.status).toBe(503);
  });

  it("rejects missing, forged and wrong-secret signatures", async () => {
    const { client } = fakeStripe();
    const deps = { config, stripe: client, ledger: new MemoryEventLedger() };
    const { payload, header } = signedEvent(paidSession());
    expect((await handleStripeWebhook(payload, null, deps)).status).toBe(400);
    expect((await handleStripeWebhook(payload, "t=1,v1=deadbeef", deps)).status).toBe(400);
    const wrong = signedEvent(paidSession(), "whsec_someone_else_0000000000");
    expect((await handleStripeWebhook(wrong.payload, wrong.header, deps)).status).toBe(400);
    // A signed payload that is altered after signing must fail too.
    expect((await handleStripeWebhook(payload.replace('"paid"', '"unpaid"'), header, deps)).status).toBe(400);
  });

  it("records a dry run once for a paid session, even when Stripe redelivers", async () => {
    const { client, update } = fakeStripe();
    const ledger = new MemoryEventLedger();
    const log = vi.fn();
    const deps = { config, stripe: client, ledger, log };
    const { payload, header } = signedEvent(paidSession());
    const first = await handleStripeWebhook(payload, header, deps);
    expect(first).toEqual({ status: 200, body: { received: true, outcome: "paid_dry_run_recorded" } });
    const again = await handleStripeWebhook(payload, header, deps);
    expect(again.body).toMatchObject({ duplicate: true });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][2]).toEqual({ idempotencyKey: "np_dryrun_cs_test_123" });
    expect(log).toHaveBeenCalledWith("printful.dry_run", expect.objectContaining({ items: 1 }));
  });

  it("uses the durable PaymentIntent marker when a different instance sees a new event for the same payment", async () => {
    const { client, update } = fakeStripe();
    const deps = (ledger: MemoryEventLedger) => ({ config, stripe: client, ledger });
    const a = signedEvent(paidSession());
    await handleStripeWebhook(a.payload, a.header, deps(new MemoryEventLedger()));
    const b = signedEvent(paidSession({ id: "evt_test_async_2", type: "checkout.session.async_payment_succeeded" }));
    const res = await handleStripeWebhook(b.payload, b.header, deps(new MemoryEventLedger()));
    expect(res.body).toMatchObject({ outcome: "already_recorded" });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("does not fulfil unpaid (async) sessions, and ignores live-mode events", async () => {
    const { client, update } = fakeStripe();
    const deps = { config, stripe: client, ledger: new MemoryEventLedger() };
    const unpaid = paidSession({ id: "evt_test_unpaid" });
    (unpaid.data as { object: Record<string, unknown> }).object.payment_status = "unpaid";
    const u = signedEvent(unpaid);
    expect((await handleStripeWebhook(u.payload, u.header, deps)).body).toMatchObject({ outcome: "awaiting_async_payment" });
    const live = signedEvent(paidSession({ id: "evt_live_1", livemode: true }));
    expect((await handleStripeWebhook(live.payload, live.header, deps)).body).toMatchObject({ ignored: "live_event" });
    expect(update).not.toHaveBeenCalled();
  });

  it("releases the claim when processing fails so Stripe's retry can succeed", async () => {
    const { client } = fakeStripe();
    let failing = true;
    client.paymentIntents.retrieve = vi.fn(async (id: string) => {
      if (failing) throw new Error("network");
      return { id, metadata: {} };
    });
    const ledger = new MemoryEventLedger();
    const deps = { config, stripe: client, ledger };
    const { payload, header } = signedEvent(paidSession({ id: "evt_test_retry" }));
    expect((await handleStripeWebhook(payload, header, deps)).status).toBe(500);
    failing = false;
    expect((await handleStripeWebhook(payload, header, deps)).body).toMatchObject({ outcome: "paid_dry_run_recorded" });
  });
});
