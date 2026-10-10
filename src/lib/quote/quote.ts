import { getProduct } from "../catalog/products";
import { PRICING_CONFIG, formatPenceExact } from "../pricing/config";
import { unitPriceFor } from "../pricing/price";
import type { ArtworkRef, Design } from "../basket/schema";

export interface QuoteItem {
  id: string;
  productId: string;
  variantId: string;
  colourId: string;
  placementId: string;
  qty: number;
  design: Design;
  artwork: ArtworkRef;
  approvedAt: string;
}

export interface PreparedQuote {
  reference: string;
  createdAt: string;
  status: "prepared_not_sent";
  disclaimer: string;
  items: {
    product: string;
    variant: string;
    colour: string;
    placement: string;
    quantity: number;
    logoMm: string;
    artwork: string;
    indicativeUnit: string;
    indicativeTotal: string;
    supplierRoute: string;
  }[];
  artworkRequirement: string;
}

/** A trade quote request, prepared locally. Nothing is sent to any supplier in this build. */
export function prepareQuote(items: QuoteItem[], now = new Date()): PreparedQuote {
  const prepared = items.flatMap((item) => {
    const product = getProduct(item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) return [];
    const unit = unitPriceFor(product, variant, item.qty);
    const aspect = item.artwork.widthPx / item.artwork.heightPx;
    return [
      {
        product: product.name,
        variant: variant.label,
        colour: product.colours.find((c) => c.id === item.colourId)?.label ?? item.colourId,
        placement: variant.placements.find((p) => p.id === item.placementId)?.label ?? item.placementId,
        quantity: item.qty,
        logoMm: `${item.design.widthMm.toFixed(1)} × ${(item.design.widthMm / aspect).toFixed(1)} mm`,
        artwork: `${item.artwork.name} (${item.artwork.kind}, ${item.artwork.widthPx}×${item.artwork.heightPx}px, ref ${item.artwork.hash.slice(0, 10)})`,
        indicativeUnit: `${formatPenceExact(unit.unitPence)} (${PRICING_CONFIG.tradeLabel})`,
        indicativeTotal: formatPenceExact(unit.unitPence * item.qty),
        supplierRoute: product.supplierNote,
      },
    ];
  });
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
  return {
    reference: `NPQ-${stamp}`,
    createdAt: now.toISOString(),
    status: "prepared_not_sent",
    disclaimer:
      "Prepared quote request, not a quote. Prices are indicative estimates. Final prices, set-up charges, carriage, colours and lead times are confirmed in writing.",
    items: prepared,
    artworkRequirement:
      "Trade printing usually needs editable vector artwork (EPS/PDF/SVG) and Pantone references. Raster logos may need redrawing by a designer before print.",
  };
}

export function quoteAsText(q: PreparedQuote): string {
  const lines = [
    `Nota Print · trade quote request ${q.reference}`,
    `Prepared ${new Date(q.createdAt).toLocaleString("en-GB")} · ${q.status.replace(/_/g, " ")}`,
    "",
    ...q.items.flatMap((i, n) => [
      `${n + 1}. ${i.product} (${i.variant}), ${i.colour}, ${i.placement}`,
      `   Quantity ${i.quantity} · logo ${i.logoMm}`,
      `   Artwork: ${i.artwork}`,
      `   Indicative: ${i.indicativeUnit} each, ${i.indicativeTotal} total`,
    ]),
    "",
    q.disclaimer,
    q.artworkRequirement,
  ];
  return lines.join("\n");
}
