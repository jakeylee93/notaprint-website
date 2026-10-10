import type { Metadata } from "next";
import Link from "next/link";
import { readStripeConfig, checkoutStatusMessage } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/client";
import { formatPenceExact } from "@/lib/pricing/config";

export const metadata: Metadata = { title: "Order status" };
export const dynamic = "force-dynamic";

/** Shows only what Stripe confirms. It never assumes a payment succeeded. */
export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const config = readStripeConfig();
  let title = "We couldn't confirm a payment.";
  let body = "No payment details were found for this page.";
  let amount: string | null = null;

  if (config.mode !== "test") {
    title = "Checkout isn't connected.";
    body = checkoutStatusMessage(config);
  } else if (session_id && /^cs_test_[A-Za-z0-9]+$/.test(session_id)) {
    try {
      const session = await getStripe(config)!.checkout.sessions.retrieve(session_id);
      amount = session.amount_total != null ? formatPenceExact(session.amount_total) : null;
      if (session.payment_status === "paid") {
        title = "Payment received (test mode).";
        body = "Stripe confirmed this test payment. Fulfilment is a dry run in this preview, so nothing will be printed or sent.";
      } else if (session.status === "complete") {
        title = "Confirming your payment…";
        body = "Your bank is still confirming this payment. This page will show the result once Stripe confirms it.";
      } else {
        title = "This checkout wasn't completed.";
        body = "No payment was taken. Your basket is still saved on this device.";
      }
    } catch {
      body = "We couldn't reach Stripe to check this payment. Nothing has been assumed.";
    }
  }

  return (
    <div className="container page-head stack-l" style={{ paddingBottom: 120 }}>
      <h1 className="display-l">{title}</h1>
      <p className="lead">{body}</p>
      {amount && <p className="tabular">Amount: {amount}</p>}
      <Link className="btn btn-quiet" href="/basket" style={{ justifySelf: "start" }}>
        Back to basket
      </Link>
    </div>
  );
}
