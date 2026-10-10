/**
 * Facts read from Printful's public, unauthenticated catalogue endpoint
 * GET https://api.printful.com/products/19 on 2026-10-10.
 *
 * Only identity, dimensions and region availability are used. The USD base costs returned by
 * the public endpoint are NOT used as retail prices anywhere in the app.
 * Exact print-file dimensions require an authenticated call (mockup-generator/printfiles),
 * so the print areas built from this snapshot are flagged provisional.
 */
export const PRINTFUL_WHITE_GLOSSY_MUG = {
  productId: 19,
  title: "White Glossy Mug",
  technique: "SUBLIMATION",
  readAt: "2026-10-10",
  source: "https://api.printful.com/products/19",
  variants: {
    "11oz": { variantId: 1320, name: "White Glossy Mug 11 oz", heightMm: 96, diameterMm: 82, ukAvailable: true },
    "15oz": { variantId: 4830, name: "White Glossy Mug 15 oz", heightMm: 119, diameterMm: 85, ukAvailable: true },
    // 20 oz (variant 16586) is not available for UK fulfilment in the snapshot, so it is excluded.
  },
  facts: ["Ceramic", "Dishwasher and microwave safe", "Glossy finish", "White only"],
} as const;
