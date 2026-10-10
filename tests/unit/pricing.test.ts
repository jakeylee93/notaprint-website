import { describe, expect, it } from "vitest";
import { PRODUCTS, getProduct } from "@/lib/catalog/products";
import { tierFor, unitPriceFor, gridPrice } from "@/lib/pricing/price";
import { priceBasket, validateLine } from "@/lib/pricing/basket";
import { BasketRequestSchema } from "@/lib/basket/schema";
import { PRINTFUL_WHITE_GLOSSY_MUG } from "@/lib/catalog/printful-snapshot";
import { mugLine } from "./helpers";

describe("catalogue integrity", () => {
  it("only the Printful mug is checkout-enabled, and only in its real colour", () => {
    const checkoutable = PRODUCTS.filter((p) => p.checkoutEnabled);
    expect(checkoutable.map((p) => p.id)).toEqual(["mug"]);
    const mug = getProduct("mug")!;
    expect(mug.colours).toEqual([{ id: "white", label: "White", hex: "#f8f8f6", verified: true }]);
    expect(mug.variants.map((v) => v.supplierRef?.variantId)).toEqual([1320, 4830]);
    expect(PRINTFUL_WHITE_GLOSSY_MUG.variants["11oz"].ukAvailable).toBe(true);
  });

  it("every non-mug colour is marked unverified and every print area is provisional", () => {
    for (const p of PRODUCTS.filter((x) => x.id !== "mug")) {
      expect(p.colours.every((c) => !c.verified)).toBe(true);
      expect(p.fulfilment).toBe("trade-quote");
    }
    for (const p of PRODUCTS) for (const v of p.variants) expect(v.printArea.provisional).toBe(true);
  });

  it("every placement slot sits inside its print area's safe zone", () => {
    for (const p of PRODUCTS) {
      for (const v of p.variants) {
        const { widthMm: W, heightMm: H, safeMm: s } = v.printArea;
        for (const pl of v.placements) {
          for (const slot of pl.slots) {
            expect(slot.cx - slot.maxW / 2).toBeGreaterThanOrEqual(s - 0.05);
            expect(slot.cx + slot.maxW / 2).toBeLessThanOrEqual(W - s + 0.05);
            expect(slot.cy - slot.maxH / 2).toBeGreaterThanOrEqual(s - 0.05);
            expect(slot.cy + slot.maxH / 2).toBeLessThanOrEqual(H - s + 0.05);
          }
        }
      }
    }
  });

  it("mug side slots sit a quarter-turn either side of the wrap centre", () => {
    const v = getProduct("mug")!.variants[0];
    const front = v.placements.find((p) => p.id === "front")!.slots[0];
    const back = v.placements.find((p) => p.id === "back")!.slots[0];
    const quarter = (Math.PI / 2) * (82 / 2);
    expect(front.cx).toBeCloseTo(100 + quarter, 1);
    expect(back.cx).toBeCloseTo(100 - quarter, 1);
  });
});

describe("tier pricing", () => {
  const mug = getProduct("mug")!;
  const v11 = mug.variants[0];
  it("picks the highest tier at or below the quantity", () => {
    expect(tierFor(v11.tiers, 1)?.minQty).toBe(1);
    expect(tierFor(v11.tiers, 9)?.minQty).toBe(1);
    expect(tierFor(v11.tiers, 10)?.minQty).toBe(10);
    expect(tierFor(v11.tiers, 49)?.minQty).toBe(25);
    expect(tierFor(v11.tiers, 300)?.minQty).toBe(50);
  });
  it("flags quantities below the product minimum for trade items", () => {
    const pen = getProduct("pen")!;
    expect(unitPriceFor(pen, pen.variants[0], 10).belowMinimum).toBe(true);
    expect(gridPrice(pen, 1).qty).toBe(25);
  });
});

describe("server-side basket pricing", () => {
  it("prices a valid mug line from the catalogue", () => {
    const priced = priceBasket([mugLine({ qty: 12 })], "checkout");
    expect(priced.errors).toEqual([]);
    expect(priced.lines[0].unitPence).toBe(1250);
    expect(priced.lines[0].totalPence).toBe(15000);
    expect(priced.shippingPence).toBe(0); // over the free-delivery threshold
    expect(priced.totalPence).toBe(15000);
    expect(priced.lines[0].supplierVariantId).toBe(1320);
  });

  it("adds demo shipping below the threshold", () => {
    const priced = priceBasket([mugLine({ qty: 1 })], "checkout");
    expect(priced.subtotalPence).toBe(1400);
    expect(priced.shippingPence).toBe(495);
    expect(priced.totalPence).toBe(1895);
  });

  it("ignores any price the client tries to send", () => {
    const tampered = { lines: [{ ...mugLine(), unitPence: 1, totalPence: 1, price: 0.01 }] };
    const parsed = BasketRequestSchema.parse(tampered);
    expect(Object.keys(parsed.lines[0])).not.toContain("unitPence");
    const priced = priceBasket(parsed.lines, "checkout");
    expect(priced.lines[0].unitPence).toBe(1400);
  });

  it("rejects trade items at checkout but prices them for display", () => {
    const line = mugLine({ productId: "pen", variantId: "standard", colourId: "black", placementId: "barrel", qty: 100, design: { widthMm: 13, offsetYmm: 0 } });
    expect(priceBasket([line], "checkout").errors.map((e) => e.code)).toContain("not_checkoutable");
    expect(priceBasket([line], "display").errors).toEqual([]);
  });

  it("rejects unknown variants, colours, placements and out-of-range quantities", () => {
    expect(validateLine(mugLine({ variantId: "20oz" }), "checkout").errors[0].code).toBe("unknown_variant");
    expect(validateLine(mugLine({ colourId: "black" }), "checkout").errors[0].code).toBe("unknown_colour");
    expect(validateLine(mugLine({ placementId: "inside" }), "checkout").errors[0].code).toBe("unknown_placement");
    expect(validateLine(mugLine({ qty: 0 }), "checkout").errors[0].code).toBe("quantity_out_of_range");
    expect(validateLine(mugLine({ qty: 251 }), "checkout").errors[0].code).toBe("quantity_out_of_range");
  });

  it("rejects artwork that leaves the printable area", () => {
    expect(validateLine(mugLine({ design: { widthMm: 120, offsetYmm: 0 } }), "checkout").errors[0].code).toBe("artwork_out_of_bounds");
    expect(validateLine(mugLine({ design: { widthMm: 50, offsetYmm: 40 } }), "checkout").errors[0].code).toBe("artwork_out_of_bounds");
  });

  it("blocks unprintably low resolution and requires acknowledgement for low resolution", () => {
    const tiny = { hash: "ffffffffffffffff", name: "small.png", kind: "raster" as const, widthPx: 150, heightPx: 75, hasAlpha: false };
    expect(validateLine(mugLine({ artwork: tiny, design: { widthMm: 60, offsetYmm: 0 } }), "checkout").errors[0].code).toBe("resolution_too_low");
    const small = { ...tiny, widthPx: 300, heightPx: 150 }; // 300px over 60mm ≈ 127 DPI
    expect(validateLine(mugLine({ artwork: small, design: { widthMm: 60, offsetYmm: 0 } }), "checkout").errors[0].code).toBe("low_resolution_not_acknowledged");
    const acknowledged = mugLine({ artwork: small, design: { widthMm: 60, offsetYmm: 0 }, proof: { approvedAt: "2026-10-10T12:00:00.000Z", version: 1, lowResolutionAcknowledged: true } });
    expect(validateLine(acknowledged, "checkout").errors).toEqual([]);
  });
});
