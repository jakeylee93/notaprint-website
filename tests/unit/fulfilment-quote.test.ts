import { describe, expect, it, vi } from "vitest";
import { buildPrintfulDryRun, parseLineMetadata, submitToPrintful } from "@/lib/fulfilment/printful-dry-run";
import { encodeLineMetadata } from "@/lib/stripe/checkout";
import { priceBasket } from "@/lib/pricing/basket";
import { prepareQuote, quoteAsText } from "@/lib/quote/quote";
import { mugLine } from "./helpers";

describe("Printful fulfilment is a dry run", () => {
  it("round-trips basket lines through Stripe metadata into a draft payload without any network call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const basket = priceBasket([mugLine({ qty: 5 })], "checkout");
    const lines = parseLineMetadata(encodeLineMetadata(basket));
    const payload = buildPrintfulDryRun({ orderRef: "NP-TEST0001", stripeSessionId: "cs_test_1", lines, recipientCountry: "GB" });
    expect(payload.dryRun).toBe(true);
    expect(payload.body.items).toEqual([{ variant_id: 1320, quantity: 5, files: [{ type: "default", url: "pending://print-master/a1b2c3d4e5f60718" }], options: [] }]);
    expect(payload.body.external_id.length).toBeLessThanOrEqual(32);
    expect(payload.blockers.join(" ")).toMatch(/disabled/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips trade items and refuses to submit", () => {
    const payload = buildPrintfulDryRun({ orderRef: "NP-X", stripeSessionId: "cs_1", recipientCountry: null, lines: [{ productId: "pen", supplierVariantId: null, qty: 100, artworkHash: "abc", placement: "Barrel", widthMm: 20, offsetYmm: 0 }] });
    expect(payload.body.items).toHaveLength(0);
    expect(payload.skipped[0].productId).toBe("pen");
    expect(() => submitToPrintful()).toThrow(/dry-run only/);
  });
});

describe("Trade quote preparation", () => {
  it("prepares an honest, unsent quote request with indicative pricing", () => {
    const q = prepareQuote(
      [{ id: "q1", productId: "pen", variantId: "standard", colourId: "navy", placementId: "barrel", qty: 500, design: { widthMm: 30, offsetYmm: 0 }, artwork: mugLine().artwork, approvedAt: "2026-10-10T12:00:00.000Z" }],
      new Date("2026-10-10T12:30:00Z"),
    );
    expect(q.status).toBe("prepared_not_sent");
    expect(q.items[0].indicativeUnit).toContain("£0.58");
    expect(q.items[0].indicativeUnit).toMatch(/not a quote/);
    expect(quoteAsText(q)).toMatch(/not a quote/i);
  });
});
