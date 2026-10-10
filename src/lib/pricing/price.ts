import type { PriceTier, Product, Variant } from "../catalog/types";

export function tierFor(tiers: PriceTier[], qty: number): PriceTier | null {
  let best: PriceTier | null = null;
  for (const t of tiers) {
    if (qty >= t.minQty && (!best || t.minQty > best.minQty)) best = t;
  }
  return best;
}

export interface UnitPrice {
  unitPence: number;
  tierMinQty: number;
  belowMinimum: boolean;
}

/** Unit price at a quantity. Below the product minimum, the first tier is quoted and flagged. */
export function unitPriceFor(product: Product, variant: Variant, qty: number): UnitPrice {
  const sorted = [...variant.tiers].sort((a, b) => a.minQty - b.minQty);
  const tier = tierFor(sorted, qty) ?? sorted[0];
  return { unitPence: tier.unitPence, tierMinQty: tier.minQty, belowMinimum: qty < product.minQty };
}

/** The cheapest unit price a product can reach, used for "from" labels. */
export function fromPrice(product: Product): number {
  return Math.min(...product.variants.flatMap((v) => v.tiers.map((t) => t.unitPence)));
}

/** Price shown in the grid for a chosen quantity (clamped to the product minimum). */
export function gridPrice(product: Product, qty: number): UnitPrice & { qty: number } {
  const effective = Math.max(qty, product.minQty);
  const variant = product.variants[0];
  return { ...unitPriceFor(product, variant, effective), qty: effective };
}
