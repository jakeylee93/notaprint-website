import { NextResponse } from "next/server";
import { BasketRequestSchema } from "@/lib/basket/schema";
import { priceBasket } from "@/lib/pricing/basket";
import { checkoutStatusMessage, readStripeConfig } from "@/lib/stripe/config";
import { buildCheckoutSessionParams, idempotencyKeyFor } from "@/lib/stripe/checkout";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

/** Whether checkout is connected (test mode only). Never exposes key material. */
export async function GET() {
  const config = readStripeConfig();
  return NextResponse.json(
    { enabled: config.mode === "test", mode: config.mode === "test" ? "test" : "disabled", message: checkoutStatusMessage(config) },
    { headers: { "cache-control": "no-store" } },
  );
}

function originFor(request: Request): string {
  const configured = process.env.SITE_URL?.trim();
  if (configured && /^https?:\/\//.test(configured)) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

/** Create a Stripe TEST Checkout Session from a basket priced entirely on the server. */
export async function POST(request: Request) {
  const config = readStripeConfig();
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_json", message: "Invalid request." }, { status: 400 });
  }
  const parsed = BasketRequestSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ code: "invalid_basket", message: "Your basket couldn't be read." }, { status: 400 });

  const basket = priceBasket(parsed.data.lines, "checkout");
  if (basket.errors.length > 0) {
    return NextResponse.json({ code: "basket_invalid", message: basket.errors[0].message, errors: basket.errors }, { status: 422 });
  }
  if (config.mode !== "test") {
    return NextResponse.json({ code: "checkout_not_configured", message: checkoutStatusMessage(config) }, { status: 503 });
  }
  const stripe = getStripe(config)!;
  try {
    const session = await stripe.checkout.sessions.create(buildCheckoutSessionParams(basket, originFor(request)), {
      idempotencyKey: idempotencyKeyFor(basket),
    });
    if (!session.url) throw new Error("no session url");
    return NextResponse.json({ url: session.url }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("checkout.create_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ code: "stripe_error", message: "Stripe couldn't start checkout. Please try again." }, { status: 502 });
  }
}
