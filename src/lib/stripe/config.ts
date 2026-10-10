/**
 * Stripe is TEST MODE ONLY in this build. Live keys are refused outright so a misconfigured
 * environment can never take a real payment.
 */
export type StripeConfig =
  | { mode: "test"; secretKey: string; webhookSecret: string | null }
  | { mode: "disabled"; reason: "missing" | "live_key_refused" | "invalid_key" };

type Env = Record<string, string | undefined>;

export function readStripeConfig(env: Env = process.env): StripeConfig {
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { mode: "disabled", reason: "missing" };
  if (/^(sk|rk)_live_/.test(key)) return { mode: "disabled", reason: "live_key_refused" };
  if (!/^(sk|rk)_test_[A-Za-z0-9]+/.test(key)) return { mode: "disabled", reason: "invalid_key" };
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || null;
  return { mode: "test", secretKey: key, webhookSecret: webhookSecret && webhookSecret.startsWith("whsec_") ? webhookSecret : null };
}

export function checkoutStatusMessage(config: StripeConfig): string {
  if (config.mode === "test") return "Stripe test mode";
  switch (config.reason) {
    case "missing":
      return "Checkout isn't connected yet. Stripe test keys haven't been added to this preview.";
    case "live_key_refused":
      return "Checkout is switched off: this preview only accepts Stripe test keys.";
    default:
      return "Checkout is switched off: the Stripe key isn't a valid test key.";
  }
}
