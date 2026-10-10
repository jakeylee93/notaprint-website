"use client";

import type { Colour, Placement, Product, Slot, Variant } from "@/lib/catalog/types";
import { composePrintArea, type ComposedPrint } from "@/lib/artwork/compose";
import { defaultWidthFor, fitLogo, maxWidthFor, type Fitted } from "@/lib/artwork/fit";
import type { DesignPrefs } from "@/state/designs";

export interface ResolvedDesign {
  variant: Variant;
  placement: Placement;
  colour: Colour;
  slot: Slot;
  aspect: number;
  maxWidthMm: number;
  fitted: Fitted;
}

/** Turn saved preferences + the current logo into a printable, in-bounds design. */
export function resolveDesign(product: Product, prefs: DesignPrefs, aspect: number): ResolvedDesign {
  const variant = product.variants.find((v) => v.id === prefs.variantId) ?? product.variants[0];
  const placement = variant.placements.find((p) => p.id === prefs.placementId) ?? variant.placements[0];
  const colour = product.colours.find((c) => c.id === prefs.colourId) ?? product.colours[0];
  const slot = placement.slots[0];
  const requested = prefs.widthMm ?? defaultWidthFor(slot, aspect);
  return { variant, placement, colour, slot, aspect, maxWidthMm: maxWidthFor(slot, aspect), fitted: fitLogo(slot, aspect, requested, prefs.offsetYmm) };
}

export function composeDesign(d: ResolvedDesign, image: CanvasImageSource, target?: HTMLCanvasElement, pxPerMm = 9): ComposedPrint {
  return composePrintArea(
    { area: d.variant.printArea, placement: d.placement, image, aspect: d.aspect, widthMm: d.fitted.widthMm, offsetYmm: d.fitted.offsetYmm, pxPerMm },
    target,
  );
}

/** Surface angle (radians, from +Z towards +X) at the centre of a slot on cylindrical products. */
export function slotAngle(product: Product, variant: Variant, slot: Slot): number | null {
  const W = variant.printArea.widthMm;
  if (product.model === "mug") {
    const r = variant.dimensions.diameterMm / 2;
    return -Math.PI / 2 + (slot.cx - W / 2) / r;
  }
  if (product.model === "bottle") {
    const r = variant.dimensions.diameterMm / 2;
    return (slot.cx - W / 2) / r;
  }
  return null;
}
