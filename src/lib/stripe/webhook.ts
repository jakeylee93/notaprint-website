import type Stripe from "stripe";
import type { StripeConfig } from "./config";
import type { EventLedger } from "./ledger";
import { buildPrintfulDryRun, parseLineMetadata, type PrintfulDryRunPayload } from "../fulfilment/printful-dry-run";

/** The slice of the Stripe client the webhook needs (lets tests inject a fake without network). */
export interface StripeLike {
  webhooks: Pick<Stripe["webhooks"], "constructEvent">;
  paymentIntents: {
    retrieve(id: string): Promise<{ id: string; metadata: Record<string, string> | null }>;
    update(id: string, params: { metadata: Record<string, string> }, options?: { idempotencyKey?: string }): Promise<unknown>;
  };
}

export interface WebhookDeps {
  config: StripeConfig;
  stripe: StripeLike | null;
  ledger: EventLedger;
  log?: (message: string, data?: Record<string, unknown>) => void;
}

export type WebhookOutcome =
  | "paid_dry_run_recorded"
  | "already_recorded"
  | "awaiting_async_payment"
  | "payment_failed"
  | "expired"
  | "ignored";

export interface WebhookResponse {
  status: number;
  body: Record<string, unknown>;
}

const DRY_RUN_MARKER = "nota_dry_run";

async function recordDryRun(session: Stripe.Checkout.Session, deps: WebhookDeps): Promise<{ outcome: WebhookOutcome; payload?: PrintfulDryRunPayload }> {
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  if (piId && deps.stripe) {
    // Durable idempotency without a database: the marker lives on the PaymentIntent in Stripe.
    const pi = await deps.stripe.paymentIntents.retrieve(piId);
    if (pi.metadata?.[DRY_RUN_MARKER] === "recorded") return { outcome: "already_recorded" };
  }
  const payload = buildPrintfulDryRun({
    orderRef: session.metadata?.nota_order_ref ?? session.id,
    stripeSessionId: session.id,
    lines: parseLineMetadata(session.metadata),
    recipientCountry: session.collected_information?.shipping_details?.address?.country ?? session.customer_details?.address?.country ?? null,
  });
  deps.log?.("printful.dry_run", { orderRef: payload.body.external_id, items: payload.body.items.length, skipped: payload.skipped.length });
  if (piId && deps.stripe) {
    await deps.stripe.paymentIntents.update(
      piId,
      { metadata: { [DRY_RUN_MARKER]: "recorded", nota_dry_run_items: String(payload.body.items.length) } },
      { idempotencyKey: `np_dryrun_${session.id}` },
    );
  }
  return { outcome: "paid_dry_run_recorded", payload };
}

/**
 * Verify, de-duplicate and process a Stripe webhook.
 * - The raw body is verified with the endpoint secret (default 300 s tolerance).
 * - Live-mode events are never processed by this test build.
 * - Each event id is claimed once; a failed run releases the claim so Stripe's retry can succeed.
 * - Paid sessions only ever produce a Printful DRY RUN; nothing is sent to a supplier.
 */
export async function handleStripeWebhook(rawBody: string, signature: string | null, deps: WebhookDeps): Promise<WebhookResponse> {
  if (deps.config.mode !== "test" || !deps.config.webhookSecret || !deps.stripe) {
    return { status: 503, body: { error: "webhook_not_configured" } };
  }
  if (!signature) return { status: 400, body: { error: "missing_signature" } };

  let event: Stripe.Event;
  try {
    event = deps.stripe.webhooks.constructEvent(rawBody, signature, deps.config.webhookSecret);
  } catch {
    return { status: 400, body: { error: "invalid_signature" } };
  }

  if (event.livemode) {
    deps.log?.("stripe.live_event_ignored", { id: event.id, type: event.type });
    return { status: 200, body: { received: true, ignored: "live_event" } };
  }

  if (!(await deps.ledger.claim(event.id))) {
    return { status: 200, body: { received: true, duplicate: true } };
  }

  try {
    let outcome: WebhookOutcome = "ignored";
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        outcome = session.payment_status === "paid" ? (await recordDryRun(session, deps)).outcome : "awaiting_async_payment";
        break;
      }
      case "checkout.session.async_payment_succeeded":
        outcome = (await recordDryRun(event.data.object as Stripe.Checkout.Session, deps)).outcome;
        break;
      case "checkout.session.async_payment_failed":
        outcome = "payment_failed";
        break;
      case "checkout.session.expired":
        outcome = "expired";
        break;
    }
    deps.log?.("stripe.event", { id: event.id, type: event.type, outcome });
    return { status: 200, body: { received: true, outcome } };
  } catch (error) {
    await deps.ledger.release(event.id);
    deps.log?.("stripe.event_failed", { id: event.id, type: event.type, error: error instanceof Error ? error.message : "unknown" });
    return { status: 500, body: { error: "processing_failed" } };
  }
}
