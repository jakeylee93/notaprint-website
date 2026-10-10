"use client";

import { z } from "zod";
import type { Product } from "@/lib/catalog/types";
import { readJson, writeJson } from "@/lib/persistence/kv";
import { createStore, useStore } from "./store";

/** Per-product configuration, remembered so it stays put across navigation and reloads. */
export interface DesignPrefs {
  variantId: string;
  colourId: string;
  placementId: string;
  /** Requested logo width in mm; always re-fitted to the slot and the current logo's aspect. */
  widthMm: number | null;
  offsetYmm: number;
  qty: number;
}

const KEY = "np.designs.v1";
const Schema = z.record(
  z.string(),
  z.object({
    variantId: z.string(),
    colourId: z.string(),
    placementId: z.string(),
    widthMm: z.number().nullable(),
    offsetYmm: z.number(),
    qty: z.number().int().positive(),
  }),
);

export const designsStore = createStore<Record<string, DesignPrefs>>({});
let hydrated = false;

export function hydrateDesigns() {
  if (hydrated) return;
  hydrated = true;
  designsStore.set(readJson(KEY, Schema, {}));
}

export function defaultsFor(product: Product): DesignPrefs {
  return {
    variantId: product.variants[0].id,
    colourId: product.colours[0].id,
    placementId: product.defaultPlacementId,
    widthMm: null,
    offsetYmm: 0,
    qty: product.minQty,
  };
}

export function useDesign(product: Product): DesignPrefs {
  const all = useStore(designsStore);
  const saved = all[product.id];
  const d = defaultsFor(product);
  if (!saved) return d;
  // Drop stale values that no longer exist in the catalogue.
  const variant = product.variants.find((v) => v.id === saved.variantId) ?? product.variants[0];
  return {
    variantId: variant.id,
    colourId: product.colours.some((c) => c.id === saved.colourId) ? saved.colourId : d.colourId,
    placementId: variant.placements.some((p) => p.id === saved.placementId) ? saved.placementId : variant.placements[0].id,
    widthMm: saved.widthMm,
    offsetYmm: saved.offsetYmm,
    qty: Math.min(product.maxQty, Math.max(product.minQty, saved.qty)),
  };
}

export function updateDesign(product: Product, patch: Partial<DesignPrefs>) {
  designsStore.set((all) => {
    const current = all[product.id] ?? defaultsFor(product);
    const next = { ...all, [product.id]: { ...current, ...patch } };
    writeJson(KEY, next);
    return next;
  });
}
