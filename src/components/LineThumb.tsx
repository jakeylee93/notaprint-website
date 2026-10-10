"use client";

import { useEffect, useRef, useState } from "react";
import { getProduct } from "@/lib/catalog/products";
import { composePrintArea } from "@/lib/artwork/compose";
import { loadArtworkById } from "@/state/artwork";

interface Props {
  productId: string;
  variantId: string;
  colourId: string;
  placementId: string;
  widthMm: number;
  offsetYmm: number;
  artworkId: string;
  label: string;
}

/** Small flat proof of a basket or quote line, redrawn from the artwork it was approved with. */
export function LineThumb(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const product = getProduct(props.productId);
      const variant = product?.variants.find((v) => v.id === props.variantId);
      const placement = variant?.placements.find((p) => p.id === props.placementId);
      const colour = product?.colours.find((c) => c.id === props.colourId);
      const art = await loadArtworkById(props.artworkId);
      if (cancelled || !canvasRef.current) return;
      if (!product || !variant || !placement || !art) {
        setMissing(true);
        return;
      }
      const composed = composePrintArea({ area: variant.printArea, placement, image: art.bitmap, aspect: art.aspect, widthMm: props.widthMm, offsetYmm: props.offsetYmm, pxPerMm: 3 });
      const c = canvasRef.current;
      c.width = composed.canvas.width;
      c.height = composed.canvas.height;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = colour?.hex ?? "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(composed.canvas, 0, 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.productId, props.variantId, props.colourId, props.placementId, props.widthMm, props.offsetYmm, props.artworkId]);
  return (
    <div className="line-thumb">
      {missing ? <span className="micro">Artwork not on this device</span> : <canvas ref={canvasRef} role="img" aria-label={props.label} />}
    </div>
  );
}
