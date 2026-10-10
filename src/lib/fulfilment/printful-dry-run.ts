/**
 * Printful fulfilment — DRY RUN ONLY.
 *
 * Builds the order payload that would be sent to Printful (v1 POST /orders, which creates a draft)
 * so it can be reviewed, but never sends it. There is no network code in this module, and
 * submitToPrintful() always throws. Enabling real submission requires explicit launch approval,
 * a validated print-file template and a durable order store.
 */

export interface DryRunLine {
  productId: string;
  supplierVariantId: number | null;
  qty: number;
  artworkHash: string;
  placement: string;
  widthMm: number;
  offsetYmm: number;
}

export interface DryRunOrder {
  orderRef: string;
  stripeSessionId: string;
  lines: DryRunLine[];
  recipientCountry: string | null;
}

export interface PrintfulDryRunPayload {
  dryRun: true;
  wouldPost: "POST https://api.printful.com/orders (draft; never confirmed)";
  body: {
    external_id: string;
    shipping: "STANDARD";
    recipient: { country_code: string | null; note: string };
    items: { variant_id: number; quantity: number; files: { type: "default"; url: string }[]; options: never[] }[];
  };
  skipped: { productId: string; reason: string }[];
  blockers: string[];
}

export function parseLineMetadata(metadata: Record<string, string> | null | undefined): DryRunLine[] {
  if (!metadata) return [];
  const count = Number(metadata.nota_lines ?? 0);
  const lines: DryRunLine[] = [];
  for (let i = 0; i < Math.min(count, 50); i++) {
    const raw = metadata[`nota_l${i}`];
    if (!raw) continue;
    const [productId, variantId, , placement, qty, hash, widthMm, offsetYmm] = raw.split("|");
    lines.push({
      productId,
      supplierVariantId: variantId ? Number(variantId) : null,
      qty: Number(qty),
      artworkHash: hash,
      placement,
      widthMm: Number(widthMm),
      offsetYmm: Number(offsetYmm),
    });
  }
  return lines;
}

export function buildPrintfulDryRun(order: DryRunOrder): PrintfulDryRunPayload {
  const items: PrintfulDryRunPayload["body"]["items"] = [];
  const skipped: PrintfulDryRunPayload["skipped"] = [];
  for (const line of order.lines) {
    if (!line.supplierVariantId) {
      skipped.push({ productId: line.productId, reason: "No Printful variant: trade/quote item" });
      continue;
    }
    items.push({
      variant_id: line.supplierVariantId,
      quantity: line.qty,
      // The print master is not generated or uploaded in this build; the reference is a placeholder.
      files: [{ type: "default", url: `pending://print-master/${line.artworkHash}` }],
      options: [],
    });
  }
  return {
    dryRun: true,
    wouldPost: "POST https://api.printful.com/orders (draft; never confirmed)",
    body: {
      external_id: order.orderRef.slice(0, 32),
      shipping: "STANDARD",
      recipient: { country_code: order.recipientCountry, note: "Full address is read from Stripe at submission time; not stored here." },
      items,
    },
    skipped,
    blockers: [
      "Supplier submission is disabled in this build.",
      "The print master must be validated against Printful's authenticated print-file template.",
      "A durable order store is required before any supplier call.",
    ],
  };
}

export function submitToPrintful(): never {
  throw new Error("Printful submission is disabled: this build is dry-run only.");
}
