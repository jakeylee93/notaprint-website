export type Fulfilment = "made-to-order" | "trade-quote";

export type Category = "drinkware" | "writing" | "bags" | "stationery";

export type ModelKind = "mug" | "pen" | "bottle" | "tote" | "notebook" | "cards";

/** Printable rectangle in millimetres. x runs left→right as seen from outside, y top→bottom. */
export interface PrintArea {
  widthMm: number;
  heightMm: number;
  /** Inner margin the artwork must stay inside. */
  safeMm: number;
  /**
   * True until the rectangle has been validated against the supplier's own print-file template.
   * Provisional areas are labelled in the UI and must not be presented as production specs.
   */
  provisional: boolean;
  note: string;
}

/** One logo position inside a print area (centre + maximum box, all mm). */
export interface Slot {
  cx: number;
  cy: number;
  maxW: number;
  maxH: number;
}

export interface Placement {
  id: string;
  label: string;
  description: string;
  slots: Slot[];
}

export interface PriceTier {
  minQty: number;
  unitPence: number;
}

export interface SupplierRef {
  supplier: "printful";
  productId: number;
  variantId: number;
  /** Where/when the reference was read. */
  source: string;
}

export interface Variant {
  id: string;
  label: string;
  supplierRef?: SupplierRef;
  printArea: PrintArea;
  placements: Placement[];
  tiers: PriceTier[];
  /** Real-world dimensions used to build the procedural preview model (mm). */
  dimensions: Record<string, number>;
}

export interface Colour {
  id: string;
  label: string;
  hex: string;
  /** True only when the colour is a real, verified supplier option for this product. */
  verified: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  summary: string;
  details: string[];
  category: Category;
  fulfilment: Fulfilment;
  model: ModelKind;
  /** Honest status line shown with the product. */
  status: string;
  /** Only made-to-order items backed by an approved supplier product can be checked out. */
  checkoutEnabled: boolean;
  colours: Colour[];
  variants: Variant[];
  defaultPlacementId: string;
  minQty: number;
  maxQty: number;
  leadTime: { label: string; verified: boolean };
  supplierNote: string;
  /** Preview models are original procedural meshes, never supplier photography. */
  previewNote: string;
  sortWeight: number;
}
