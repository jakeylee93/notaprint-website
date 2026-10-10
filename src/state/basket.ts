"use client";

import { z } from "zod";
import { BasketLineSchema, type BasketLine } from "@/lib/basket/schema";
import { readJson, writeJson } from "@/lib/persistence/kv";
import type { QuoteItem } from "@/lib/quote/quote";
import { ArtworkRefSchema, DesignSchema } from "@/lib/basket/schema";
import { createStore, useStore } from "./store";

const BASKET_KEY = "np.basket.v1";
const QUOTE_KEY = "np.quote.v1";

const BasketFileSchema = z.object({ lines: z.array(BasketLineSchema).max(50) });
const QuoteItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string(),
  colourId: z.string(),
  placementId: z.string(),
  qty: z.number().int().positive(),
  design: DesignSchema,
  artwork: ArtworkRefSchema,
  approvedAt: z.string(),
});
const QuoteFileSchema = z.object({ items: z.array(QuoteItemSchema).max(50) });

interface BasketState {
  hydrated: boolean;
  lines: BasketLine[];
  quote: QuoteItem[];
}

export const basketStore = createStore<BasketState>({ hydrated: false, lines: [], quote: [] });

export function hydrateBasket() {
  if (basketStore.get().hydrated) return;
  const lines = readJson(BASKET_KEY, BasketFileSchema, { lines: [] }).lines;
  const quote = readJson(QUOTE_KEY, QuoteFileSchema, { items: [] }).items;
  basketStore.set({ hydrated: true, lines, quote });
  window.addEventListener("storage", (e) => {
    if (e.key === BASKET_KEY || e.key === QUOTE_KEY) {
      basketStore.set({
        hydrated: true,
        lines: readJson(BASKET_KEY, BasketFileSchema, { lines: [] }).lines,
        quote: readJson(QUOTE_KEY, QuoteFileSchema, { items: [] }).items,
      });
    }
  });
}

function persist(state: BasketState) {
  writeJson(BASKET_KEY, { lines: state.lines });
  writeJson(QUOTE_KEY, { items: state.quote });
}

export function addLine(line: BasketLine) {
  basketStore.set((s) => {
    const next = { ...s, lines: [...s.lines, line] };
    persist(next);
    return next;
  });
}

export function updateLineQty(id: string, qty: number) {
  basketStore.set((s) => {
    const next = { ...s, lines: s.lines.map((l) => (l.id === id ? { ...l, qty } : l)) };
    persist(next);
    return next;
  });
}

export function removeLine(id: string) {
  basketStore.set((s) => {
    const next = { ...s, lines: s.lines.filter((l) => l.id !== id) };
    persist(next);
    return next;
  });
}

export function addQuoteItem(item: QuoteItem) {
  basketStore.set((s) => {
    const next = { ...s, quote: [...s.quote, item] };
    persist(next);
    return next;
  });
}

export function removeQuoteItem(id: string) {
  basketStore.set((s) => {
    const next = { ...s, quote: s.quote.filter((q) => q.id !== id) };
    persist(next);
    return next;
  });
}

export function referencedArtworkIds(): Set<string> {
  const s = basketStore.get();
  return new Set([...s.lines.map((l) => l.artwork.hash), ...s.quote.map((q) => q.artwork.hash)]);
}

export function useBasket() {
  return useStore(basketStore);
}

export function newId(prefix: string) {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : Math.random().toString(36).slice(2, 18);
  return `${prefix}-${rand}`;
}
