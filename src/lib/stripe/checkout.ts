import { createHash } from "node:crypto";
import type Stripe from "stripe";
import type { PricedBasket } from "../pricing/basket";
import { PRICING_CONFIG } from "../pricing/config";

/** Compact, metadata-safe description of each line (Stripe metadata values max 500 chars). */
export function encodeLineMetadata(basket: PricedBasket): Record<string, string> {
  const meta: Record<string, string> = { nota_lines: String(basket.lines.length), nota_mode: "test", nota_fulfilment: "dry_run" };
  basket.lines.forEach((l, i) => {
    meta[`nota_l${i}`] = [l.productId, l.supplierVariantId ?? "", l.variantLabel, l.placementLabel, l.qty, l.artworkHash.slice(0, 16), l.widthMm, l.offsetYmm].join("|");
  });
  return meta;
}

/** Stable key: the same basket contents always map to the same Checkout Session request. */
export function idempotencyKeyFor(basket: PricedBasket): string {
  const canonical = JSON.stringify(
    basket.lines.map((l) => [l.productId, l.variantLabel, l.colourLabel, l.placementLabel, l.qty, l.artworkHash, l.widthMm, l.offsetYmm, l.unitPence]),
  );
  return "np_cs_" + createHash("sha256").update(canonical).digest("hex").slice(0, 40);
}

export function orderRefFor(basket: PricedBasket): string {
  return "NP-" + idempotencyKeyFor(basket).slice(6, 14).toUpperCase();
}

/**
 * Build Checkout Session params from a server-priced basket only. Amounts come from the
 * catalogue via priceBasket(); there is no code path that accepts a client amount.
 */
export function buildCheckoutSessionParams(basket: PricedBasket, origin: string): Stripe.Checkout.SessionCreateParams {
  if (basket.errors.length > 0) throw new Error("Refusing to build a session for a basket with validation errors");
  if (basket.lines.length === 0) throw new Error("Refusing to build a session for an empty basket");
  const orderRef = orderRefFor(basket);
  const metadata = { ...encodeLineMetadata(basket), nota_order_ref: orderRef };
  return {
    mode: "payment",
    ui_mode: "hosted_page",
    currency: PRICING_CONFIG.currency,
    client_reference_id: orderRef,
    line_items: basket.lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: PRICING_CONFIG.currency,
        unit_amount: l.unitPence,
        product_data: {
          name: `${l.name} · ${l.variantLabel}`,
          description: `${l.colourLabel}, ${l.placementLabel}. Logo ${l.widthMm} mm wide. Demo estimate price (test mode).`,
          metadata: { nota_product: l.productId, nota_artwork: l.artworkHash.slice(0, 16) },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: ["GB"] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: PRICING_CONFIG.shipping.label,
          fixed_amount: { amount: basket.shippingPence, currency: PRICING_CONFIG.currency },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/basket?checkout=cancelled`,
  };
}
