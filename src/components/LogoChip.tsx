"use client";

import { useShell } from "./AppShell";
import { removeArtwork, useArtwork } from "@/state/artwork";

/** The customer's current logo, with Replace and Remove. */
export function LogoChip({ compact = false }: { compact?: boolean }) {
  const { openFilePicker } = useShell();
  const { artwork, status } = useArtwork();
  if (!artwork) return null;
  return (
    <span className="logo-chip" data-testid="logo-chip">
      <span className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artwork.previewUrl} alt="" />
      </span>
      {!compact && <span className="name">{artwork.name}</span>}
      {compact && <span className="name">Your logo</span>}
      <button type="button" onClick={openFilePicker} disabled={status === "processing"}>
        Replace
      </button>
      <button type="button" className="remove" onClick={() => void removeArtwork()} data-testid="remove-logo">
        Remove
      </button>
    </span>
  );
}
