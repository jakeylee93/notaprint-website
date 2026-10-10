import "server-only";
import Stripe from "stripe";
import type { StripeConfig } from "./config";

let cached: { key: string; client: Stripe } | null = null;

/** Server-only Stripe client, created lazily and only for a validated TEST configuration. */
export function getStripe(config: StripeConfig): Stripe | null {
  if (config.mode !== "test") return null;
  if (cached?.key === config.secretKey) return cached.client;
  const client = new Stripe(config.secretKey, {
    apiVersion: "2026-09-30.endive",
    maxNetworkRetries: 1,
    appInfo: { name: "nota-print-preview" },
  });
  cached = { key: config.secretKey, client };
  return client;
}
