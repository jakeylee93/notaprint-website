/**
 * Demo commercial settings. Every figure here is a placeholder estimate for the preview build,
 * not a verified price. Change them in one place; the client and server both read this file.
 */
export const PRICING_CONFIG = {
  currency: "gbp" as const,
  priceLabel: "Demo estimate",
  tradeLabel: "Indicative estimate · not a quote",
  shipping: {
    madeToOrderFlatPence: 495,
    freeOverPence: 7500,
    label: "UK delivery (demo estimate)",
  },
  vatNote: "Demo prices for the preview. VAT treatment is confirmed before launch.",
};

export function formatPence(pence: number): string {
  const pounds = pence / 100;
  const hasPence = pence % 100 !== 0;
  return `£${pounds.toLocaleString("en-GB", { minimumFractionDigits: hasPence ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function formatPenceExact(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
