"use client";

import { buildPlaceholderArtwork, processArtworkFile, type ProcessedArtwork } from "@/lib/artwork/process";
import { createArtworkRepository, type ArtworkRepository } from "@/lib/persistence/artwork-repo";
import type { ArtworkRef } from "@/lib/basket/schema";
import { createStore, useStore } from "./store";
import { referencedArtworkIds } from "./basket";

export interface LoadedArtwork extends ProcessedArtwork {
  bitmap: ImageBitmap;
  previewUrl: string;
  aspect: number;
  isPlaceholder: boolean;
}

export interface ArtworkState {
  status: "loading" | "empty" | "processing" | "ready" | "error";
  artwork: LoadedArtwork | null;
  placeholder: LoadedArtwork | null;
  error: string | null;
  /** Incremented on every change so consumers can cheaply detect a new logo. */
  version: number;
}

const CURRENT_KEY = "np.artwork.current";

export const artworkStore = createStore<ArtworkState>({ status: "loading", artwork: null, placeholder: null, error: null, version: 0 });

let repo: ArtworkRepository | null = null;
const getRepo = () => (repo ??= createArtworkRepository());

async function load(p: ProcessedArtwork, isPlaceholder = false): Promise<LoadedArtwork> {
  const bitmap = await createImageBitmap(p.previewBlob);
  return { ...p, bitmap, previewUrl: URL.createObjectURL(p.previewBlob), aspect: p.widthPx / p.heightPx, isPlaceholder };
}

let initialised = false;

export async function initArtwork() {
  if (initialised) return;
  initialised = true;
  const placeholder = await load(await buildPlaceholderArtwork(), true);
  artworkStore.set((s) => ({ ...s, placeholder, version: s.version + 1 }));
  let current: LoadedArtwork | null = null;
  try {
    const id = window.localStorage.getItem(CURRENT_KEY);
    if (id) {
      const stored = await getRepo().get(id);
      if (stored) current = await load(stored);
    }
  } catch {
    current = null;
  }
  artworkStore.set((s) => ({ ...s, status: current ? "ready" : "empty", artwork: current, error: null, version: s.version + 1 }));
  // Keep artwork that baskets/quotes still reference; drop the rest.
  const keep = referencedArtworkIds();
  if (current) keep.add(current.id);
  void getRepo().prune(keep).catch(() => undefined);
}

export async function uploadArtwork(file: File): Promise<boolean> {
  artworkStore.set((s) => ({ ...s, status: "processing", error: null }));
  const result = await processArtworkFile(file).catch(() => ({ ok: false as const, message: "Something went wrong reading that file." }));
  if (!result.ok) {
    artworkStore.set((s) => ({ ...s, status: s.artwork ? "ready" : "error", error: result.message, version: s.version + 1 }));
    return false;
  }
  await getRepo().put(result.artwork).catch(() => undefined);
  const loaded = await load(result.artwork);
  const previous = artworkStore.get().artwork;
  try {
    window.localStorage.setItem(CURRENT_KEY, loaded.id);
  } catch {
    /* in-memory only */
  }
  artworkStore.set((s) => ({ ...s, status: "ready", artwork: loaded, error: null, version: s.version + 1 }));
  if (previous && previous.id !== loaded.id) {
    URL.revokeObjectURL(previous.previewUrl);
    if (!referencedArtworkIds().has(previous.id)) void getRepo().remove(previous.id).catch(() => undefined);
  }
  return true;
}

export function clearArtworkError() {
  artworkStore.set((s) => ({ ...s, error: null, status: s.artwork ? "ready" : "empty" }));
}

export async function removeArtwork() {
  const previous = artworkStore.get().artwork;
  try {
    window.localStorage.removeItem(CURRENT_KEY);
  } catch {
    /* ignore */
  }
  artworkStore.set((s) => ({ ...s, status: "empty", artwork: null, error: null, version: s.version + 1 }));
  if (previous) {
    URL.revokeObjectURL(previous.previewUrl);
    if (!referencedArtworkIds().has(previous.id)) void getRepo().remove(previous.id).catch(() => undefined);
  }
}

/** Load a specific stored artwork (e.g. the one a basket line was proofed with). */
export async function loadArtworkById(id: string): Promise<LoadedArtwork | null> {
  const current = artworkStore.get().artwork;
  if (current?.id === id) return current;
  const stored = await getRepo().get(id);
  return stored ? load(stored) : null;
}

export function artworkRef(a: LoadedArtwork): ArtworkRef {
  return { hash: a.id, name: a.name, kind: a.kind, widthPx: a.widthPx, heightPx: a.heightPx, hasAlpha: a.hasAlpha };
}

export function useArtwork() {
  return useStore(artworkStore);
}

/** The customer's logo when present, otherwise the "Your logo here" placeholder. */
export function useDisplayArtwork(): LoadedArtwork | null {
  const s = useArtwork();
  return s.artwork ?? s.placeholder;
}
