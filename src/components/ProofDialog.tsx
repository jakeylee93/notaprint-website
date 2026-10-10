"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/catalog/types";
import { DPI_MESSAGES, type DpiRating } from "@/lib/artwork/dpi";
import { formatPenceExact, PRICING_CONFIG } from "@/lib/pricing/config";
import { unitPriceFor } from "@/lib/pricing/price";
import { addLine, addQuoteItem, newId } from "@/state/basket";
import { artworkRef, type LoadedArtwork } from "@/state/artwork";
import type { ResolvedDesign } from "./design-utils";
import { ProofCanvas, type ProofCanvasHandle } from "./ProofCanvas";

interface Props {
  product: Product;
  design: ResolvedDesign;
  artwork: LoadedArtwork;
  qty: number;
  rating: DpiRating | null;
  dpi: number;
  onClose: () => void;
}

export function ProofDialog({ product, design, artwork, qty, rating, dpi, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const proofRef = useRef<ProofCanvasHandle>(null);
  const [approved, setApproved] = useState(false);
  const [lowAck, setLowAck] = useState(false);
  const [added, setAdded] = useState<"basket" | "quote" | null>(null);
  const needsLowAck = rating === "low";
  const canAdd = approved && (!needsLowAck || lowAck) && rating !== "too-low";
  const unit = unitPriceFor(product, design.variant, qty);
  const trade = !product.checkoutEnabled;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);

  const add = () => {
    const approvedAt = new Date().toISOString();
    const ref = artworkRef(artwork);
    const base = {
      productId: product.id,
      variantId: design.variant.id,
      colourId: design.colour.id,
      placementId: design.placement.id,
      qty,
      design: { widthMm: design.fitted.widthMm, offsetYmm: design.fitted.offsetYmm },
      artwork: ref,
    };
    if (trade) {
      addQuoteItem({ id: newId("q"), ...base, approvedAt });
      setAdded("quote");
    } else {
      addLine({ id: newId("line"), ...base, proof: { approvedAt, version: 1, lowResolutionAcknowledged: needsLowAck ? lowAck : undefined } });
      setAdded("basket");
    }
  };

  const download = async () => {
    const blob = await proofRef.current?.toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nota-print-web-proof-${product.slug}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="proof-title" data-testid="proof-dialog">
      <div className="dialog-inner">
        <div className="dialog-head">
          <div className="stack-s">
            <h2 id="proof-title" className="display-s">
              Proof · {product.name}, {design.variant.label}
            </h2>
            <p className="micro" style={{ margin: 0 }}>
              Flat view of the print area at real proportions. This is a web proof for checking position and size, not the production print file.
            </p>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Close proof">
            ×
          </button>
        </div>

        <div className="proof-grid">
          <div className="proof-sheet">
            <ProofCanvas ref={proofRef} design={design} artwork={artwork} label={`Proof of ${artwork.name} on the ${product.name}, ${design.placement.label}`} />
          </div>
          <div className="stack-l">
            <dl className="proof-facts">
              <dt>Product</dt>
              <dd>
                {product.name}, {design.variant.label}
              </dd>
              <dt>Colour</dt>
              <dd>{design.colour.label}</dd>
              <dt>Position</dt>
              <dd>{design.placement.label}</dd>
              <dt>Logo size</dt>
              <dd className="tabular" data-testid="proof-size">
                {design.fitted.widthMm.toFixed(1)} × {design.fitted.heightMm.toFixed(1)} mm
                {design.placement.slots.length > 1 ? ` (× ${design.placement.slots.length})` : ""}
              </dd>
              <dt>Artwork</dt>
              <dd>
                {artwork.name}
                <br />
                <span className="micro">
                  {artwork.kind === "vector" ? "Vector (SVG)" : `${artwork.type.toUpperCase()}, ${artwork.widthPx}×${artwork.heightPx}px`}
                  {artwork.hasAlpha ? ", transparent background" : ", solid background"}
                </span>
              </dd>
              <dt>Resolution</dt>
              <dd data-testid="proof-dpi">
                {rating ? DPI_MESSAGES[rating] : ""}
                {Number.isFinite(dpi) ? ` ${Math.round(dpi)} DPI.` : ""}
              </dd>
              <dt>Quantity</dt>
              <dd className="tabular">
                {qty.toLocaleString("en-GB")} × {formatPenceExact(unit.unitPence)} = {formatPenceExact(unit.unitPence * qty)}
                <br />
                <span className="micro">{trade ? PRICING_CONFIG.tradeLabel : PRICING_CONFIG.priceLabel}</span>
              </dd>
            </dl>
            <p className="micro" style={{ margin: 0 }}>
              Screen colours vary, and printed colours can differ slightly from what you see here. {design.variant.printArea.note}
            </p>

            {added ? (
              <div className="notice" role="status" data-testid="added-notice">
                {added === "basket" ? "Added to your basket." : "Added to your trade quote."}{" "}
                <Link className="link" href={added === "basket" ? "/basket" : "/quote"}>
                  {added === "basket" ? "View basket" : "View quote"}
                </Link>
              </div>
            ) : (
              <div className="stack-m">
                <label className="check">
                  <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} data-testid="approve" />
                  <span>I&apos;ve checked the artwork, size and position, and approve this proof.</span>
                </label>
                {needsLowAck && (
                  <label className="check">
                    <input type="checkbox" checked={lowAck} onChange={(e) => setLowAck(e.target.checked)} data-testid="ack-low" />
                    <span>I understand this logo is low resolution at this size and may print soft.</span>
                  </label>
                )}
                <button type="button" className="btn btn-primary btn-large" disabled={!canAdd} onClick={add} data-testid="add-to-basket">
                  {trade ? "Add to trade quote" : "Add to basket"}
                </button>
              </div>
            )}
            <button type="button" className="text-button" onClick={() => void download()} style={{ justifySelf: "start" }}>
              Download web proof (PNG, not a print file)
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
