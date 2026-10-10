"use client";

import Link from "next/link";
import { useState } from "react";
import { getProduct } from "@/lib/catalog/products";
import { prepareQuote, quoteAsText, type PreparedQuote } from "@/lib/quote/quote";
import { removeQuoteItem, useBasket } from "@/state/basket";
import { LineThumb } from "./LineThumb";

export function QuoteView() {
  const { quote, hydrated } = useBasket();
  const [prepared, setPrepared] = useState<PreparedQuote | null>(null);
  const [copied, setCopied] = useState(false);
  if (!hydrated) return <div className="container page-head" aria-busy="true" />;
  const text = prepared ? quoteAsText(prepared) : "";

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prepared?.reference ?? "quote"}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="container" style={{ paddingBottom: 96 }}>
      <div className="page-head stack-m">
        <h1 className="display-l">Trade quote</h1>
        <p className="lead">Configure and proof trade items, then prepare a quote request. Nothing is sent from this preview, and prices are indicative only.</p>
      </div>
      {quote.length === 0 ? (
        <div className="empty">
          <p className="display-s">No trade items yet.</p>
          <Link className="btn btn-primary" href="/products/ballpoint-pen">
            Configure pens
          </Link>
        </div>
      ) : (
        <div className="basket-layout">
          <div>
            {quote.map((q) => {
              const product = getProduct(q.productId);
              return (
                <div className="line" key={q.id} data-testid="quote-line">
                  <LineThumb productId={q.productId} variantId={q.variantId} colourId={q.colourId} placementId={q.placementId} widthMm={q.design.widthMm} offsetYmm={q.design.offsetYmm} artworkId={q.artwork.hash} label={`Proof for ${product?.name}`} />
                  <div className="stack-s">
                    <span style={{ fontWeight: 500 }}>{product?.name}</span>
                    <span className="small muted">
                      {q.qty.toLocaleString("en-GB")} · {product?.colours.find((c) => c.id === q.colourId)?.label} · logo {q.design.widthMm.toFixed(1)} mm
                    </span>
                    <button type="button" className="text-button" style={{ justifySelf: "start" }} onClick={() => removeQuoteItem(q.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <aside className="summary">
            <button type="button" className="btn btn-primary btn-large" onClick={() => setPrepared(prepareQuote(quote))} data-testid="prepare-quote">
              Prepare quote request
            </button>
            <p className="micro" style={{ margin: 0 }}>
              We ask for editable vector artwork for trade printing. Final prices, set-up charges, carriage and lead times are confirmed in writing.
            </p>
          </aside>
        </div>
      )}
      {prepared && (
        <div className="stack-m" style={{ marginTop: 40 }} data-testid="prepared-quote">
          <h2 className="display-s">Request {prepared.reference}</h2>
          <pre className="quote-text">{text}</pre>
          <div className="cta-row">
            <button type="button" className="btn btn-quiet" onClick={download}>
              Download as text
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                void navigator.clipboard?.writeText(text).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
