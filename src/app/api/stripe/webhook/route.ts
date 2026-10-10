import { NextResponse } from "next/server";
import { readStripeConfig } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/client";
import { MemoryEventLedger } from "@/lib/stripe/ledger";
import { handleStripeWebhook } from "@/lib/stripe/webhook";

export const dynamic = "force-dynamic";

// Per-instance de-duplication; the durable marker lives on the PaymentIntent (see webhook.ts).
const ledger = new MemoryEventLedger();

export async function POST(request: Request) {
  // Signature verification needs the exact raw body.
  const rawBody = await request.text();
  const config = readStripeConfig();
  const result = await handleStripeWebhook(rawBody, request.headers.get("stripe-signature"), {
    config,
    stripe: getStripe(config),
    ledger,
    log: (message, data) => console.info(message, JSON.stringify(data ?? {})),
  });
  return NextResponse.json(result.body, { status: result.status });
}
