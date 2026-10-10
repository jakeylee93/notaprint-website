"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { drawProof } from "@/lib/artwork/proof";
import type { ResolvedDesign } from "./design-utils";
import type { LoadedArtwork } from "@/state/artwork";

export interface ProofCanvasHandle {
  toBlob(): Promise<Blob | null>;
}

export const ProofCanvas = forwardRef<ProofCanvasHandle, { design: ResolvedDesign; artwork: LoadedArtwork; label: string }>(function ProofCanvas({ design, artwork, label }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(ref, () => ({
    toBlob: () => new Promise((resolve) => (canvasRef.current ? canvasRef.current.toBlob(resolve, "image/png") : resolve(null))),
  }));
  useEffect(() => {
    if (!canvasRef.current) return;
    drawProof(canvasRef.current, {
      area: design.variant.printArea,
      placement: design.placement,
      image: artwork.bitmap,
      aspect: artwork.aspect,
      widthMm: design.fitted.widthMm,
      offsetYmm: design.fitted.offsetYmm,
      productHex: design.colour.hex,
    });
  }, [design, artwork]);
  return <canvas ref={canvasRef} role="img" aria-label={label} data-testid="proof-canvas" />;
});
