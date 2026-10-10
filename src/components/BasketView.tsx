"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getProduct } from "@/lib/catalog/products";
import { PRICING_CONFIG, formatPenceExact } from "@/lib/pricing/config";
import { priceBasket, type PricedBasket } from "@/lib/pricing/basket";
import { removeLine, updateLineQty, useBasket } from "@/state/basket";
import { LineThumb } from "./LineThumb";

type CheckoutStatus = { enabled: boolean; message: string } | null;

export function BasketView() {
  const { lines, quote, hydrated } = useBasket();
  const search = useSearchParams();
  const [server, setServer] = useState<{ basket: PricedBasket | null; error: string | null; checking: boolean }>({ basket: null, error: null, checking: false });
  const [status, setStatus] = useState<CheckoutStatus>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  // Local estimate for instant feedback; the server's figures are the ones that count.
  const local = useMemo(() => priceBasket(lines, "checkout"), [lines]);

  useEffect(() => {
    fetch("/api/checkout", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => setStatus({ enabled: !!s.enabled, message: String(s.message ?? "") }))
      .catch(() => setStatus({ enabled: false, message: "Couldn't reach checkout." }));
  }, []);

  useEffect(() => {
    if (!hydrated || lines.length === 0) {
      setServer({ basket: null, error: null, checking: false });
      return;
    }
    const ctrl = new AbortController();
    setServer((s) => ({ ...s, checking: true }));
    fetch("/api/price", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines, context: "checkout" }), signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? "Price check failed");
        setServer({ basket: body as PricedBasket, error: null, checking: false });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setServer({ basket: null, error: "We couldn't confirm prices with the server.", checking: false });
      });
    return () => ctrl.abort();
  }, [lines, hydrated]);

  const checkout = async () => {
    setCheckoutError(null);
    setRedirecting(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines }) });
      const body = await r.json();
      if (r.ok && typeof body.url === "string") {
        window.location.assign(body.url);
        return;
      }
      setCheckoutError(body.message ?? "Checkout isn't available right now.");
    } catch {
      setCheckoutError("Checkout isn't available right now.");
    }
    setRedirecting(false);
  };

  if (!hydrated) return <div className="container page-head" aria-busy="true" />;

  const shown = server.basket ?? local;
  const errors = shown.errors;
  const cancelled = search.get("checkout") === "cancelled";

  return (
    <div className="container">
      <div className="page-head stack-m">
        <h1 className="display-l">Basket</h1>
        {cancelled && <p className="notice">Checkout was cancelled. Nothing was charged.</p>}
        {quote.length > 0 && (
          <p className="muted" style={{ margin: 0 }}>
            You also have {quote.length} {quote.length === 1 ? "item" : "items"} in a{" "}
            <Link className="link" href="/quote">
              trade quote
            </Link>
            .
          </p>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="empty">
          <p className="display-s">Your basket is empty.</p>
          <Link className="btn btn-primary" href="/#products">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="basket-layout" style={{ paddingBottom: 96 }}>
          <div data-testid="basket-lines">
            {lines.map((line) => {
              const product = getProduct(line.productId);
              const priced = shown.lines.find((l) => l.id === line.id);
              const lineErrors = errors.filter((e) => e.lineId === line.id);
              return (
                <div className="line" key={line.id} data-testid="basket-line">
                  <LineThumb
                    productId={line.productId}
                    variantId={line.variantId}
                    colourId={line.colourId}
                    placementId={line.placementId}
                    widthMm={line.design.widthMm}
                    offsetYmm={line.design.offsetYmm}
                    artworkId={line.artwork.hash}
                    label={`Approved proof for ${product?.name ?? "item"}`}
                  />
                  <div className="stack-s">
                    <span style={{ fontWeight: 500 }}>
                      {product?.name ?? line.productId}
                      {priced ? `, ${priced.variantLabel}` : ""}
                    </span>
                    <span className="small muted">
                      {priced?.colourLabel} · {priced?.placementLabel} · logo {line.design.widthMm.toFixed(1)} mm wide
                    </span>
                    <span className="micro">Proof approved {new Date(line.proof.approvedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div className="stepper" style={{ height: 40 }}>
                        <button type="button" aria-label="Fewer" style={{ width: 40, height: 40 }} onClick={() => product && updateLineQty(line.id, Math.max(product.minQty, line.qty - 1))}>
                          −
                        </button>
                        <input aria-label="Quantity" type="number" value={line.qty} readOnly style={{ width: 52 }} />
                        <button type="button" aria-label="More" style={{ width: 40, height: 40 }} onClick={() => product && updateLineQty(line.id, Math.min(product.maxQty, line.qty + 1))}>
                          +
                        </button>
                      </div>
                      <button type="button" className="text-button" onClick={() => removeLine(line.id)}>
                        Remove
                      </button>
                    </div>
                    {lineErrors.map((e) => (
                      <p key={e.code} className="notice alert" style={{ margin: 0 }}>
                        {e.message}
                      </p>
                    ))}
                  </div>
                  <span className="line-total tabular">{priced ? formatPenceExact(priced.totalPence) : "—"}</span>
                </div>
              );
            })}
          </div>

          <aside className="summary" aria-label="Order summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPenceExact(shown.subtotalPence)}</span>
            </div>
            <div className="summary-row">
              <span>{PRICING_CONFIG.shipping.label}</span>
              <span>{shown.shippingPence === 0 ? "Free" : formatPenceExact(shown.shippingPence)}</span>
            </div>
            <div className="summary-row">
              <span>Total</span>
              <span className="summary-total" data-testid="basket-total">
                {formatPenceExact(shown.totalPence)}
              </span>
            </div>
            <span className="status-line" data-testid="server-price-status">
              <span className={`flag ${server.basket && !server.error ? "good" : server.error ? "bad" : ""}`} />
              {server.checking ? "Checking prices with the server…" : server.error ? server.error : server.basket ? "Prices confirmed by the server" : ""}
            </span>
            <p className="micro" style={{ margin: 0 }}>
              {PRICING_CONFIG.priceLabel}. {PRICING_CONFIG.vatNote}
            </p>
            {status?.enabled ? (
              <button type="button" className="btn btn-primary btn-large" onClick={() => void checkout()} disabled={redirecting || errors.length > 0} data-testid="checkout">
                {redirecting ? "Opening Stripe…" : "Checkout (Stripe test mode)"}
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-primary btn-large" disabled aria-disabled="true" data-testid="checkout-disabled">
                  Checkout unavailable
                </button>
                <p className="micro" style={{ margin: 0 }} data-testid="checkout-status">
                  {status ? status.message : "Checking checkout…"} No payment can be taken in this preview.
                </p>
              </>
            )}
            {checkoutError && <p className="notice alert">{checkoutError}</p>}
            <p className="micro" style={{ margin: 0 }}>
              Fulfilment is a dry run in this build: no order is sent to Printful or any supplier.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
