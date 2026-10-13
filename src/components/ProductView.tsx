"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/catalog/types";
import { DPI_MESSAGES, effectiveDpi, rateDpi } from "@/lib/artwork/dpi";
import { maxOffsetFor } from "@/lib/artwork/fit";
import { PRICING_CONFIG, formatPenceExact } from "@/lib/pricing/config";
import { unitPriceFor } from "@/lib/pricing/price";
import type { Viewer3D } from "@/three/viewer";
import { useShell } from "./AppShell";
import { composeDesign, resolveDesign, slotAngle } from "./design-utils";
import { ProofDialog } from "./ProofDialog";
import { useArtwork, useDisplayArtwork } from "@/state/artwork";
import { updateDesign, useDesign } from "@/state/designs";

export function ProductView({ product }: { product: Product }) {
  const prefs = useDesign(product);
  const display = useDisplayArtwork();
  const { artwork, status } = useArtwork();
  const { openFilePicker } = useShell();
  const viewerHost = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer3D | null>(null);
  const printCanvas = useRef<HTMLCanvasElement | null>(null);
  const [viewerState, setViewerState] = useState<"loading" | "ready" | "fallback">("loading");
  const [viewLabel, setViewLabel] = useState("");
  const [proofOpen, setProofOpen] = useState(false);

  const aspect = display?.aspect ?? 2;
  const design = useMemo(() => resolveDesign(product, prefs, aspect), [product, prefs, aspect]);
  const { variant, placement, colour, fitted, slot, maxWidthMm } = design;
  const qty = prefs.qty;
  const unit = unitPriceFor(product, variant, qty);
  const isRaster = artwork?.kind === "raster";
  const dpi = artwork && isRaster ? effectiveDpi(artwork.widthPx, fitted.widthMm) : Infinity;
  const rating = artwork ? rateDpi(dpi, !isRaster) : null;

  // One lazy viewer per page. three.js loads only when this component mounts.
  useEffect(() => {
    let disposed = false;
    (async () => {
      const { webglAvailable } = await import("@/three/core");
      if (!webglAvailable()) {
        setViewerState("fallback");
        return;
      }
      const { Viewer3D } = await import("@/three/viewer");
      if (disposed || !viewerHost.current) return;
      try {
        viewerRef.current = new Viewer3D(viewerHost.current, {
          onFallback: () => setViewerState("fallback"),
          onViewChange: (t) => setViewLabel(t),
        });
        setViewerState("ready");
      } catch {
        setViewerState("fallback");
      }
    })();
    return () => {
      disposed = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
  }, []);

  // Rebuild the model when the variant changes (geometry differs); recolour in place otherwise.
  useEffect(() => {
    if (viewerState !== "ready") return;
    viewerRef.current?.setProduct(product, variant, colour.hex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerState, product, variant.id]);

  useEffect(() => {
    viewerRef.current?.setColour(colour.hex);
  }, [colour.hex]);

  // Compose the print area and push it to the 3D surface (same canvas as the proof).
  useEffect(() => {
    if (!display) return;
    printCanvas.current ??= document.createElement("canvas");
    composeDesign(design, display.bitmap, printCanvas.current);
    if (viewerState === "ready") viewerRef.current?.setPrintCanvas(printCanvas.current);
  }, [design, display, viewerState]);

  // Turn the chosen placement towards the viewer.
  useEffect(() => {
    if (viewerState !== "ready") return;
    const angle = slotAngle(product, variant, slot);
    if (angle !== null) viewerRef.current?.faceAngle(angle);
  }, [viewerState, product, variant, slot]);

  const set = useCallback((patch: Parameters<typeof updateDesign>[1]) => updateDesign(product, patch), [product]);
  const maxOffset = maxOffsetFor(slot, fitted.heightMm);
  const isCylinder = product.model === "mug" || product.model === "bottle";
  const blocked = rating === "too-low";

  return (
    <div className="container product-layout">
      <div className="viewer-col">
        <Link className="back-link" href="/#products">
          ← All products
        </Link>
        <div
          ref={viewerHost}
          className="viewer"
          tabIndex={0}
          role="application"
          aria-roledescription="3D product viewer"
          aria-label={`${product.name} in 3D. Use the arrow keys to rotate, plus and minus to zoom, zero to reset.`}
          data-testid="viewer"
          data-state={viewerState}
        >
          {viewerState === "fallback" && (
            <div className="viewer-fallback">
              <div className="stack-m">
                <p className="muted small">3D preview isn&apos;t available on this device. The flat proof below shows exactly what will print.</p>
              </div>
            </div>
          )}
        </div>
        <div className="view-controls" aria-label="View controls">
          <button type="button" className="text-button" onClick={() => viewerRef.current?.rotateBy(-30)} disabled={viewerState !== "ready"}>
            Rotate left
          </button>
          <button type="button" className="text-button" onClick={() => viewerRef.current?.rotateBy(30)} disabled={viewerState !== "ready"}>
            Rotate right
          </button>
          {isCylinder &&
            variant.placements
              .filter((p) => p.slots.length === 1)
              .slice(0, 3)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="text-button"
                  disabled={viewerState !== "ready"}
                  onClick={() => {
                    const a = slotAngle(product, variant, p.slots[0]);
                    if (a !== null) viewerRef.current?.faceAngle(a);
                  }}
                >
                  View {p.label.toLowerCase()}
                </button>
              ))}
          <button type="button" className="text-button" onClick={() => viewerRef.current?.zoomBy(1.18)} disabled={viewerState !== "ready"}>
            Zoom in
          </button>
          <button type="button" className="text-button" onClick={() => viewerRef.current?.zoomBy(1 / 1.18)} disabled={viewerState !== "ready"}>
            Zoom out
          </button>
          <button type="button" className="text-button" onClick={() => viewerRef.current?.reset()} disabled={viewerState !== "ready"}>
            Reset
          </button>
        </div>
        <p className="micro">{product.previewNote}</p>
        <p className="sr-only" aria-live="polite">
          {viewLabel}
        </p>
      </div>

      <div className="panel">
        <div className="stack-s">
          <h1 className="display-m">{product.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {product.summary}
          </p>
          <span className="status-line">
            <span className={`flag ${product.checkoutEnabled ? "good" : ""}`} />
            {product.status}
          </span>
        </div>

        <div className="panel-block">
          <div className="block-label">
            <span>Your logo</span>
          </div>
          {artwork ? (
            <div className="artwork-box" data-testid="artwork-box">
              <span className="thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artwork.previewUrl} alt="" />
              </span>
              <div className="stack-s" style={{ gap: 4, minWidth: 0 }}>
                <span className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {artwork.name}
                </span>
                <span className="status-line" data-testid="dpi-status" data-rating={rating ?? ""}>
                  <span className={`flag ${rating === "vector" || rating === "sharp" || rating === "good" ? "good" : rating === "low" ? "warn" : "bad"}`} />
                  {rating ? DPI_MESSAGES[rating] : ""}
                  {isRaster && Number.isFinite(dpi) ? ` (${Math.round(dpi)} DPI)` : ""}
                </span>
                <span>
                  <button type="button" className="text-button" onClick={openFilePicker}>
                    Replace logo
                  </button>
                </span>
              </div>
            </div>
          ) : (
            <div className="artwork-box">
              <div className="stack-s">
                <span className="small">Showing a placeholder. Upload your logo to see it here and to order.</span>
                <span>
                  <button type="button" className="btn btn-primary btn-small" onClick={openFilePicker} disabled={status === "processing"} data-testid="panel-upload">
                    {status === "processing" ? "Preparing…" : "Upload your logo"}
                  </button>
                </span>
              </div>
            </div>
          )}
          {artwork?.warnings.map((w) => (
            <p key={w} className="micro" style={{ margin: 0 }}>
              {w}
            </p>
          ))}
        </div>

        {product.variants.length > 1 && (
          <div className="panel-block">
            <div className="block-label">
              <span>Size</span>
              <strong>{variant.label}</strong>
            </div>
            <div className="segmented" role="group" aria-label="Size">
              {product.variants.map((v) => (
                <button key={v.id} type="button" aria-pressed={v.id === variant.id} onClick={() => set({ variantId: v.id })}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="panel-block">
          <div className="block-label">
            <span>Colour</span>
            <strong>{colour.label}</strong>
          </div>
          <div className="swatches" role="group" aria-label="Colour">
            {product.colours.map((c) => (
              <button key={c.id} type="button" className="swatch" style={{ background: c.hex }} aria-pressed={c.id === colour.id} aria-label={c.label} onClick={() => set({ colourId: c.id })} />
            ))}
          </div>
          <p className="micro" style={{ margin: 0 }}>
            {product.colours.every((c) => c.verified)
              ? product.colours.length === 1
                ? `${colour.label} is the only colour this product comes in.`
                : "Colours are the supplier's real options."
              : "Preview colours. Exact shades are confirmed with the supplier at quote."}
          </p>
        </div>

        <div className="panel-block">
          <div className="block-label">
            <span>Position</span>
            <strong>{placement.label}</strong>
          </div>
          <div className="segmented" role="group" aria-label="Print position">
            {variant.placements.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.id === placement.id} onClick={() => set({ placementId: p.id })} data-testid={`placement-${p.id}`}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="micro" style={{ margin: 0 }}>
            {placement.description}
          </p>
        </div>

        <div className="panel-block">
          <div className="block-label">
            <label htmlFor="logo-width">Logo width</label>
            <strong className="tabular" data-testid="logo-size">
              {fitted.widthMm.toFixed(1)} × {fitted.heightMm.toFixed(1)} mm
            </strong>
          </div>
          <input
            id="logo-width"
            className="range"
            type="range"
            min={Math.min(5, maxWidthMm)}
            max={maxWidthMm}
            step={0.5}
            value={fitted.widthMm}
            onChange={(e) => set({ widthMm: Number(e.target.value) })}
            aria-valuetext={`${fitted.widthMm.toFixed(1)} millimetres wide, maximum ${maxWidthMm.toFixed(1)}`}
            data-testid="logo-width"
          />
          <div className="block-label">
            <label htmlFor="logo-offset">Up / down</label>
            <span className="tabular">{fitted.offsetYmm === 0 ? "Centred" : `${fitted.offsetYmm > 0 ? "Down" : "Up"} ${Math.abs(fitted.offsetYmm).toFixed(1)} mm`}</span>
          </div>
          <input
            id="logo-offset"
            className="range"
            type="range"
            min={-maxOffset}
            max={maxOffset}
            step={0.5}
            value={fitted.offsetYmm}
            disabled={maxOffset < 0.5}
            onChange={(e) => set({ offsetYmm: Number(e.target.value) })}
          />
          <p className="micro" style={{ margin: 0 }}>
            The logo always stays inside the printable area: up to {maxWidthMm.toFixed(1)} mm wide in this position.{" "}
            {variant.printArea.provisional ? variant.printArea.note : ""}
          </p>
        </div>

        <div className="panel-block">
          <div className="block-label">
            <label htmlFor="qty">Quantity</label>
            <span>
              {product.minQty > 1 ? `Minimum ${product.minQty.toLocaleString("en-GB")}` : "From one"}
            </span>
          </div>
          <div className="stepper">
            <button type="button" aria-label="Fewer" onClick={() => set({ qty: Math.max(product.minQty, qty - (qty > 100 ? 25 : 1)) })}>
              −
            </button>
            <input
              id="qty"
              type="number"
              inputMode="numeric"
              min={product.minQty}
              max={product.maxQty}
              value={qty}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (Number.isFinite(n)) set({ qty: Math.min(product.maxQty, Math.max(product.minQty, n)) });
              }}
              data-testid="qty"
            />
            <button type="button" aria-label="More" onClick={() => set({ qty: Math.min(product.maxQty, qty + (qty >= 100 ? 25 : 1)) })}>
              +
            </button>
          </div>
          <div className="tiers tabular" aria-label="Price breaks">
            {variant.tiers.map((t) => (
              <span key={t.minQty} className={unit.tierMinQty === t.minQty ? "on" : ""}>
                {t.minQty.toLocaleString("en-GB")}+ · {formatPenceExact(t.unitPence)}
              </span>
            ))}
          </div>
        </div>

        <div className="panel-block price-block">
          <span className="price-big tabular" data-testid="line-total">
            {formatPenceExact(unit.unitPence * qty)}
          </span>
          <span className="small muted tabular">
            {qty.toLocaleString("en-GB")} × {formatPenceExact(unit.unitPence)} ·{" "}
            {product.fulfilment === "made-to-order" ? PRICING_CONFIG.priceLabel : PRICING_CONFIG.tradeLabel}
          </span>
          <span className="small muted">{product.leadTime.label}</span>
        </div>

        <div className="stack-s">
          {artwork ? (
            <button type="button" className="btn btn-primary btn-large" onClick={() => setProofOpen(true)} disabled={blocked} data-testid="review-proof">
              Review proof
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-large" onClick={openFilePicker} data-testid="upload-to-continue">
              Upload your logo to continue
            </button>
          )}
          {blocked && <p className="notice alert">{DPI_MESSAGES["too-low"]}</p>}
          <p className="micro" style={{ margin: 0 }}>
            {product.supplierNote}
          </p>
        </div>

        <ul className="details-list">
          {product.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>

      {proofOpen && artwork && <ProofDialog product={product} design={design} artwork={artwork} qty={qty} rating={rating} dpi={dpi} onClose={() => setProofOpen(false)} />}
    </div>
  );
}
