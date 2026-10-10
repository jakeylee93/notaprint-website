import type { Placement, PrintArea, Product } from "./types";
import { PRINTFUL_WHITE_GLOSSY_MUG as PF } from "./printful-snapshot";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Mug wrap geometry: the print area is centred opposite the handle and wraps the cylinder.
 * Front = the face you see with the handle on the right; Back = handle on the left.
 * Arc length from the centre to a face 90° away is (π/2)·r.
 */
function mugPlacements(area: PrintArea, radiusMm: number): Placement[] {
  const W = area.widthMm;
  const H = area.heightMm;
  const s = area.safeMm;
  const quarter = (Math.PI / 2) * radiusMm;
  const front = W / 2 + quarter;
  const back = W / 2 - quarter;
  // Symmetric: the back slot's distance to the left edge equals the front slot's distance to the right edge.
  const halfWidth = back - s;
  if (halfWidth <= 0) throw new Error("Mug print area too narrow for side placements");
  const sideMaxW = round1(2 * halfWidth);
  const maxH = H - 2 * s;
  const side = (cx: number) => ({ cx: round1(cx), cy: H / 2, maxW: Math.min(sideMaxW, 80), maxH });
  return [
    { id: "front", label: "Front", description: "Faces out with the handle on the right.", slots: [side(front)] },
    { id: "back", label: "Back", description: "Faces out with the handle on the left.", slots: [side(back)] },
    { id: "both", label: "Both sides", description: "The same logo on the front and the back.", slots: [side(front), side(back)] },
    { id: "centre", label: "Centre", description: "One larger logo opposite the handle.", slots: [{ cx: W / 2, cy: H / 2, maxW: 110, maxH }] },
  ];
}

const mug11Area: PrintArea = {
  widthMm: 200,
  heightMm: 80,
  safeMm: 3,
  provisional: true,
  note: "Provisional wrap area. To be calibrated against Printful's print-file template before production.",
};
const mug15Area: PrintArea = {
  widthMm: 210,
  heightMm: 100,
  safeMm: 3,
  provisional: true,
  note: "Provisional wrap area. To be calibrated against Printful's print-file template before production.",
};

const prototypeArea = (widthMm: number, heightMm: number, safeMm: number): PrintArea => ({
  widthMm,
  heightMm,
  safeMm,
  provisional: true,
  note: "Prototype print area. Exact size and method are confirmed with the supplier at quote.",
});

const TRADE_STATUS = "Trade quantities · quote only · prototype preview";
const TRADE_SUPPLIER =
  "Trade supplier (Laltex route). Specs, colours and prices are confirmed on a written quote; nothing here is a live price.";
const PROTOTYPE_PREVIEW = "Prototype 3D preview built from an original procedural model, not supplier geometry.";

export const PRODUCTS: Product[] = [
  {
    id: "mug",
    slug: "white-glossy-mug",
    name: "White glossy mug",
    summary: "Ceramic, glossy, dishwasher and microwave safe.",
    details: [
      "Printful White Glossy Mug (catalogue product 19)",
      "11 oz: 9.6 cm tall, 8.2 cm across · 15 oz: 11.9 cm tall, 8.5 cm across",
      "Sublimation print that wraps the mug",
      "White is the only colour offered for this mug",
    ],
    category: "drinkware",
    fulfilment: "made-to-order",
    model: "mug",
    status: "Made to order · from one",
    checkoutEnabled: true,
    colours: [{ id: "white", label: "White", hex: "#f8f8f6", verified: true }],
    variants: [
      {
        id: "11oz",
        label: "11 oz",
        supplierRef: { supplier: "printful", productId: PF.productId, variantId: PF.variants["11oz"].variantId, source: `${PF.source} (read ${PF.readAt})` },
        printArea: mug11Area,
        placements: mugPlacements(mug11Area, PF.variants["11oz"].diameterMm / 2),
        tiers: [
          { minQty: 1, unitPence: 1400 },
          { minQty: 10, unitPence: 1250 },
          { minQty: 25, unitPence: 1100 },
          { minQty: 50, unitPence: 1000 },
        ],
        dimensions: { heightMm: PF.variants["11oz"].heightMm, diameterMm: PF.variants["11oz"].diameterMm },
      },
      {
        id: "15oz",
        label: "15 oz",
        supplierRef: { supplier: "printful", productId: PF.productId, variantId: PF.variants["15oz"].variantId, source: `${PF.source} (read ${PF.readAt})` },
        printArea: mug15Area,
        placements: mugPlacements(mug15Area, PF.variants["15oz"].diameterMm / 2),
        tiers: [
          { minQty: 1, unitPence: 1600 },
          { minQty: 10, unitPence: 1450 },
          { minQty: 25, unitPence: 1300 },
          { minQty: 50, unitPence: 1200 },
        ],
        dimensions: { heightMm: PF.variants["15oz"].heightMm, diameterMm: PF.variants["15oz"].diameterMm },
      },
    ],
    defaultPlacementId: "front",
    minQty: 1,
    maxQty: 250,
    leadTime: { label: "About 4–7 working days (Printful UK, estimate)", verified: false },
    supplierNote:
      "Fulfilment partner: Printful (UK). In this preview, fulfilment is a dry run: no Printful draft, order or confirmation is ever created.",
    previewNote:
      "3D preview built from an original procedural model at the published 11 oz / 15 oz dimensions. Not supplier geometry.",
    sortWeight: 1,
  },
  {
    id: "pen",
    slug: "ballpoint-pen",
    name: "Ballpoint pen",
    summary: "Slim twist pen with a printed barrel.",
    details: ["Logo printed along the barrel", "Typical trade minimum: 25", "Lead time confirmed at proof"],
    category: "writing",
    fulfilment: "trade-quote",
    model: "pen",
    status: TRADE_STATUS,
    checkoutEnabled: false,
    colours: [
      { id: "white", label: "White", hex: "#f4f4f2", verified: false },
      { id: "black", label: "Black", hex: "#1b1b1d", verified: false },
      { id: "navy", label: "Navy", hex: "#1f2a44", verified: false },
    ],
    variants: [
      {
        id: "standard",
        label: "Standard",
        printArea: prototypeArea(45, 8, 0.6),
        placements: [{ id: "barrel", label: "Barrel", description: "Along the length of the barrel.", slots: [{ cx: 22.5, cy: 4, maxW: 43.8, maxH: 6.8 }] }],
        tiers: [
          { minQty: 25, unitPence: 120 },
          { minQty: 100, unitPence: 85 },
          { minQty: 250, unitPence: 68 },
          { minQty: 500, unitPence: 58 },
          { minQty: 1000, unitPence: 49 },
          { minQty: 2500, unitPence: 42 },
        ],
        dimensions: { lengthMm: 140, diameterMm: 10 },
      },
    ],
    defaultPlacementId: "barrel",
    minQty: 25,
    maxQty: 25000,
    leadTime: { label: "Confirmed at proof", verified: false },
    supplierNote: TRADE_SUPPLIER,
    previewNote: PROTOTYPE_PREVIEW,
    sortWeight: 2,
  },
  {
    id: "bottle",
    slug: "steel-water-bottle",
    name: "Steel water bottle",
    summary: "Double-wall stainless bottle, 500 ml.",
    details: ["Printed or engraved front", "Typical trade minimum: 25", "Lead time confirmed at proof"],
    category: "drinkware",
    fulfilment: "trade-quote",
    model: "bottle",
    status: TRADE_STATUS,
    checkoutEnabled: false,
    colours: [
      { id: "white", label: "White", hex: "#f2f2f0", verified: false },
      { id: "black", label: "Black", hex: "#1c1c1e", verified: false },
      { id: "steel", label: "Brushed steel", hex: "#b9bcc0", verified: false },
    ],
    variants: [
      {
        id: "500ml",
        label: "500 ml",
        printArea: prototypeArea(180, 90, 3),
        placements: [
          { id: "front", label: "Front", description: "One logo on the front.", slots: [{ cx: 90, cy: 45, maxW: 70, maxH: 84 }] },
          { id: "wide", label: "Wide front", description: "A wider logo that wraps slightly round.", slots: [{ cx: 90, cy: 45, maxW: 150, maxH: 60 }] },
        ],
        tiers: [
          { minQty: 25, unitPence: 1150 },
          { minQty: 50, unitPence: 1000 },
          { minQty: 100, unitPence: 900 },
          { minQty: 250, unitPence: 820 },
          { minQty: 500, unitPence: 760 },
        ],
        dimensions: { heightMm: 250, diameterMm: 72 },
      },
    ],
    defaultPlacementId: "front",
    minQty: 25,
    maxQty: 10000,
    leadTime: { label: "Confirmed at proof", verified: false },
    supplierNote: TRADE_SUPPLIER,
    previewNote: PROTOTYPE_PREVIEW,
    sortWeight: 3,
  },
  {
    id: "tote",
    slug: "cotton-tote",
    name: "Cotton tote",
    summary: "Heavy cotton shopper with long handles.",
    details: ["Screen or transfer print on the front", "Typical trade minimum: 25", "Lead time confirmed at proof"],
    category: "bags",
    fulfilment: "trade-quote",
    model: "tote",
    status: TRADE_STATUS,
    checkoutEnabled: false,
    colours: [
      { id: "natural", label: "Natural", hex: "#ece4d4", verified: false },
      { id: "black", label: "Black", hex: "#1d1d1f", verified: false },
    ],
    variants: [
      {
        id: "standard",
        label: "38 × 42 cm",
        printArea: prototypeArea(250, 250, 5),
        placements: [
          { id: "centre", label: "Centre", description: "Centred on the front.", slots: [{ cx: 125, cy: 125, maxW: 240, maxH: 240 }] },
          { id: "upper", label: "Upper", description: "Higher on the front, smaller.", slots: [{ cx: 125, cy: 62, maxW: 180, maxH: 90 }] },
        ],
        tiers: [
          { minQty: 25, unitPence: 480 },
          { minQty: 50, unitPence: 420 },
          { minQty: 100, unitPence: 360 },
          { minQty: 250, unitPence: 320 },
          { minQty: 500, unitPence: 290 },
        ],
        dimensions: { widthMm: 380, heightMm: 420 },
      },
    ],
    defaultPlacementId: "centre",
    minQty: 25,
    maxQty: 10000,
    leadTime: { label: "Confirmed at proof", verified: false },
    supplierNote: TRADE_SUPPLIER,
    previewNote: PROTOTYPE_PREVIEW,
    sortWeight: 4,
  },
  {
    id: "notebook",
    slug: "a5-notebook",
    name: "A5 notebook",
    summary: "Soft-touch hardback with an elastic closure.",
    details: ["Printed or debossed cover", "Typical trade minimum: 25", "Lead time confirmed at proof"],
    category: "stationery",
    fulfilment: "trade-quote",
    model: "notebook",
    status: TRADE_STATUS,
    checkoutEnabled: false,
    colours: [
      { id: "black", label: "Black", hex: "#202022", verified: false },
      { id: "stone", label: "Stone", hex: "#d9d4ca", verified: false },
    ],
    variants: [
      {
        id: "a5",
        label: "A5",
        printArea: prototypeArea(110, 150, 4),
        placements: [
          { id: "centre", label: "Centre", description: "Centred on the cover.", slots: [{ cx: 55, cy: 75, maxW: 102, maxH: 142 }] },
          { id: "corner", label: "Lower corner", description: "A small mark low on the cover.", slots: [{ cx: 80, cy: 132, maxW: 40, maxH: 18 }] },
        ],
        tiers: [
          { minQty: 25, unitPence: 720 },
          { minQty: 50, unitPence: 640 },
          { minQty: 100, unitPence: 560 },
          { minQty: 250, unitPence: 500 },
        ],
        dimensions: { widthMm: 148, heightMm: 210, depthMm: 14 },
      },
    ],
    defaultPlacementId: "centre",
    minQty: 25,
    maxQty: 5000,
    leadTime: { label: "Confirmed at proof", verified: false },
    supplierNote: TRADE_SUPPLIER,
    previewNote: PROTOTYPE_PREVIEW,
    sortWeight: 5,
  },
  {
    id: "cards",
    slug: "business-cards",
    name: "Business cards",
    summary: "Heavy uncoated card, 85 × 55 mm.",
    details: ["Single-sided print", "Sold per card, minimum 250", "Print partner confirmed at quote"],
    category: "stationery",
    fulfilment: "trade-quote",
    model: "cards",
    status: "Print · quote only · prototype preview",
    checkoutEnabled: false,
    colours: [{ id: "white", label: "White", hex: "#fbfbf9", verified: false }],
    variants: [
      {
        id: "standard",
        label: "85 × 55 mm",
        printArea: prototypeArea(75, 45, 2),
        placements: [
          { id: "centre", label: "Centre", description: "Centred on the card.", slots: [{ cx: 37.5, cy: 22.5, maxW: 71, maxH: 41 }] },
          { id: "corner", label: "Top left", description: "A smaller mark in the top-left corner.", slots: [{ cx: 18, cy: 11, maxW: 30, maxH: 14 }] },
        ],
        tiers: [
          { minQty: 250, unitPence: 12 },
          { minQty: 500, unitPence: 8 },
          { minQty: 1000, unitPence: 5 },
        ],
        dimensions: { widthMm: 85, heightMm: 55, stack: 14 },
      },
    ],
    defaultPlacementId: "centre",
    minQty: 250,
    maxQty: 20000,
    leadTime: { label: "Confirmed at proof", verified: false },
    supplierNote: "Print partner not yet chosen. Shown for the grid layout and quote preparation only.",
    previewNote: PROTOTYPE_PREVIEW,
    sortWeight: 6,
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
