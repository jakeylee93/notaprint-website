import { getProduct } from "../catalog/products";
import type { Product, Variant } from "../catalog/types";
import type { BasketLine } from "../basket/schema";
import { effectiveDpi, rateDpi } from "../artwork/dpi";
import { maxOffsetFor, maxWidthFor } from "../artwork/fit";
import { PRICING_CONFIG } from "./config";
import { unitPriceFor } from "./price";

export type PricingContext = "display" | "checkout";

export interface LineError {
  lineId: string;
  code:
    | "unknown_product"
    | "unknown_variant"
    | "unknown_colour"
    | "unknown_placement"
    | "not_checkoutable"
    | "quantity_out_of_range"
    | "artwork_out_of_bounds"
    | "resolution_too_low"
    | "low_resolution_not_acknowledged";
  message: string;
}

export interface PricedLine {
  id: string;
  productId: string;
  name: string;
  variantLabel: string;
  colourLabel: string;
  placementLabel: string;
  qty: number;
  unitPence: number;
  totalPence: number;
  tierMinQty: number;
  supplierVariantId?: number;
  artworkHash: string;
  widthMm: number;
  offsetYmm: number;
}

export interface PricedBasket {
  currency: "gbp";
  demo: true;
  lines: PricedLine[];
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
  errors: LineError[];
}

const TOLERANCE_MM = 0.6;

/**
 * Validate one line against the catalogue. Everything that affects price or printability is
 * re-derived here from server-side data; nothing priced comes from the client.
 */
export function validateLine(line: BasketLine, context: PricingContext): { product?: Product; variant?: Variant; errors: LineError[] } {
  const errors: LineError[] = [];
  const err = (code: LineError["code"], message: string) => errors.push({ lineId: line.id, code, message });

  const product = getProduct(line.productId);
  if (!product) {
    err("unknown_product", "This product is no longer available.");
    return { errors };
  }
  const variant = product.variants.find((v) => v.id === line.variantId);
  if (!variant) {
    err("unknown_variant", "This size or version is no longer available.");
    return { product, errors };
  }
  if (!product.colours.some((c) => c.id === line.colourId)) err("unknown_colour", "This colour isn't offered for this product.");
  const placement = variant.placements.find((p) => p.id === line.placementId);
  if (!placement) {
    err("unknown_placement", "This print position isn't offered for this product.");
    return { product, variant, errors };
  }
  if (context === "checkout" && !product.checkoutEnabled) {
    err("not_checkoutable", "Trade items are prepared as a quote, not paid for online.");
  }
  if (line.qty < product.minQty || line.qty > product.maxQty) {
    err("quantity_out_of_range", `Quantity must be between ${product.minQty} and ${product.maxQty}.`);
  }

  const aspect = line.artwork.widthPx / line.artwork.heightPx;
  for (const slot of placement.slots) {
    const maxW = maxWidthFor(slot, aspect);
    const heightMm = line.design.widthMm / aspect;
    const maxOffset = maxOffsetFor(slot, heightMm);
    if (line.design.widthMm > maxW + TOLERANCE_MM || heightMm > slot.maxH + TOLERANCE_MM || Math.abs(line.design.offsetYmm) > maxOffset + TOLERANCE_MM) {
      err("artwork_out_of_bounds", "The logo extends beyond the printable area.");
      break;
    }
  }

  if (line.artwork.kind === "raster") {
    const rating = rateDpi(effectiveDpi(line.artwork.widthPx, line.design.widthMm), false);
    if (rating === "too-low") err("resolution_too_low", "The logo resolution is too low to print at this size.");
    if (rating === "low" && !line.proof.lowResolutionAcknowledged) {
      err("low_resolution_not_acknowledged", "Low-resolution artwork needs to be acknowledged on the proof.");
    }
  }
  return { product, variant, errors };
}

export function priceBasket(lines: BasketLine[], context: PricingContext): PricedBasket {
  const priced: PricedLine[] = [];
  const errors: LineError[] = [];
  for (const line of lines) {
    const { product, variant, errors: lineErrors } = validateLine(line, context);
    errors.push(...lineErrors);
    if (!product || !variant) continue;
    const placement = variant.placements.find((p) => p.id === line.placementId);
    const colour = product.colours.find((c) => c.id === line.colourId);
    const unit = unitPriceFor(product, variant, line.qty);
    priced.push({
      id: line.id,
      productId: product.id,
      name: product.name,
      variantLabel: variant.label,
      colourLabel: colour?.label ?? line.colourId,
      placementLabel: placement?.label ?? line.placementId,
      qty: line.qty,
      unitPence: unit.unitPence,
      totalPence: unit.unitPence * line.qty,
      tierMinQty: unit.tierMinQty,
      supplierVariantId: variant.supplierRef?.variantId,
      artworkHash: line.artwork.hash,
      widthMm: line.design.widthMm,
      offsetYmm: line.design.offsetYmm,
    });
  }
  const subtotalPence = priced.reduce((s, l) => s + l.totalPence, 0);
  const hasMadeToOrder = priced.some((l) => getProduct(l.productId)?.fulfilment === "made-to-order");
  const { madeToOrderFlatPence, freeOverPence } = PRICING_CONFIG.shipping;
  const shippingPence = hasMadeToOrder && subtotalPence < freeOverPence ? madeToOrderFlatPence : 0;
  return {
    currency: "gbp",
    demo: true,
    lines: priced,
    subtotalPence,
    shippingPence,
    totalPence: subtotalPence + shippingPence,
    errors,
  };
}
