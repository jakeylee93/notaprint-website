"use client";

import Link from "next/link";
import { getProduct } from "@/lib/catalog/products";
import { useDisplayArtwork, useArtwork } from "@/state/artwork";
import { useDesign } from "@/state/designs";
import { resolveDesign } from "./design-utils";
import { ProofCanvas } from "./ProofCanvas";

/** The real proof UI on the homepage, drawn with the visitor's own logo when they have one. */
export function ProofShowcase() {
  const mug = getProduct("mug")!;
  const prefs = useDesign(mug);
  const display = useDisplayArtwork();
  const { artwork } = useArtwork();
  if (!display) return <div className="proof-sheet" style={{ minHeight: 240 }} aria-hidden="true" />;
  const design = resolveDesign(mug, prefs, display.aspect);
  return (
    <div className="proof-grid">
      <div className="proof-sheet">
        <ProofCanvas design={design} artwork={display} label={`Flat proof of the ${mug.name} print area`} />
      </div>
      <div className="stack-m">
        <dl className="proof-facts">
          <dt>Product</dt>
          <dd>
            {mug.name}, {design.variant.label}
          </dd>
          <dt>Position</dt>
          <dd>{design.placement.label}</dd>
          <dt>Logo size</dt>
          <dd className="tabular">
            {design.fitted.widthMm.toFixed(1)} × {design.fitted.heightMm.toFixed(1)} mm
          </dd>
          <dt>Artwork</dt>
          <dd>{artwork ? `${artwork.name} (${artwork.kind === "vector" ? "vector" : `${artwork.widthPx}×${artwork.heightPx}px`})` : "Placeholder until you upload"}</dd>
        </dl>
        <p className="micro">{design.variant.printArea.note}</p>
        <Link className="btn btn-quiet" href="/products/white-glossy-mug">
          Open the mug in 3D
        </Link>
      </div>
    </div>
  );
}
