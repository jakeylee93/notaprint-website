"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import catalog from "@/lib/catalog/printful-catalog.json";
import { useShell } from "./AppShell";
import { useArtwork } from "@/state/artwork";

type Colour = { name: string; hex: string; image: string; sizes: string[] };
type RailProduct = {
  printfulId: number;
  slug: string;
  name: string;
  brandModel: string;
  category: string;
  techniques: string[];
  placements: { id: string; label: string }[];
  colours: Colour[];
};

const PRODUCTS = catalog.products as RailProduct[];
const FILTERS = [
  { id: "all", label: "All" },
  { id: "hoodies", label: "Hoodies" },
  { id: "sweatshirts", label: "Sweatshirts" },
  { id: "tees", label: "Tees" },
  { id: "caps", label: "Caps" },
  { id: "drinkware", label: "Mugs" },
];
/** Products with a calibrated in-browser 3D model and print area. */
const THREE_D: Record<number, string> = { 19: "/products/white-glossy-mug" };

function defaultColour(p: RailProduct) {
  return Math.max(0, p.colours.findIndex((c) => /^black$/i.test(c.name)));
}

export function Rail() {
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [colourBy, setColourBy] = useState<Record<number, number>>({});
  const [placementBy, setPlacementBy] = useState<Record<number, string>>({});
  const track = useRef<HTMLDivElement>(null);
  const { openFilePicker } = useShell();
  const { artwork } = useArtwork();

  const items = useMemo(() => PRODUCTS.filter((p) => filter === "all" || p.category === filter), [filter]);
  const current = items[Math.min(active, items.length - 1)];
  const colourIndex = (p: RailProduct) => colourBy[p.printfulId] ?? defaultColour(p);
  const colour = current ? current.colours[colourIndex(current)] : undefined;
  const placement = current ? (placementBy[current.printfulId] ?? current.placements[0]?.id) : undefined;

  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = track.current?.children[i] as HTMLElement | undefined;
    if (!el || !track.current) return;
    const left = el.offsetLeft - (track.current.clientWidth - el.clientWidth) / 2;
    track.current.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Keep the centred item active as the rail is scrolled (native scroll, snap-aligned).
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = t.scrollLeft + t.clientWidth / 2;
        let best = 0;
        let bestD = Infinity;
        Array.from(t.children).forEach((c, i) => {
          const el = c as HTMLElement;
          const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        setActive(best);
      });
    };
    t.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      t.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  useEffect(() => {
    setActive(0);
    setOpen(false);
    requestAnimationFrame(() => scrollTo(0, false));
  }, [filter, scrollTo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const step = (d: number) => scrollTo(Math.max(0, Math.min(items.length - 1, active + d)));

  return (
    <section id="shop" className="rail-section" aria-label="Products">
      <div className="rail-filters" role="tablist" aria-label="Category">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} data-testid={`filter-${f.id}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className={`rail-wall${open ? " is-open" : ""}`}>
        <div
          className="rail-track"
          ref={track}
          tabIndex={0}
          aria-roledescription="carousel"
          aria-label="Products, use the arrow keys to browse"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") (e.preventDefault(), step(1));
            if (e.key === "ArrowLeft") (e.preventDefault(), step(-1));
            if (e.key === "Enter") setOpen(true);
          }}
          data-testid="rail"
        >
          {items.map((p, i) => {
            const c = p.colours[colourIndex(p)];
            return (
              <button
                key={p.printfulId}
                type="button"
                className={`rail-item${i === active ? " is-active" : ""}`}
                aria-current={i === active}
                aria-label={`${p.name}, ${c.name}`}
                onClick={() => (i === active ? setOpen(true) : scrollTo(i))}
                data-testid={`rail-${p.slug}`}
              >
                {/* Printful's own catalogue photograph of this product in this colour. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" loading={i < 4 ? "eager" : "lazy"} draggable={false} />
                <span className="rail-frame" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <button type="button" className="rail-arrow prev" onClick={() => step(-1)} disabled={active === 0} aria-label="Previous product">
          ←
        </button>
        <button type="button" className="rail-arrow next" onClick={() => step(1)} disabled={active >= items.length - 1} aria-label="Next product">
          →
        </button>
      </div>

      {current && colour && (
        <div className="rail-caption" aria-live="polite">
          <h2 className="rail-name" data-testid="rail-name">
            {current.name}
          </h2>
          <p className="rail-meta">
            {current.brandModel} · {colour.name}
          </p>
          <div className="rail-swatches" role="group" aria-label="Colour">
            {current.colours.slice(0, 14).map((c, i) => (
              <button
                key={c.name}
                type="button"
                className="swatch-dot"
                style={{ background: c.hex }}
                aria-label={c.name}
                aria-pressed={i === colourIndex(current)}
                onClick={() => setColourBy((m) => ({ ...m, [current.printfulId]: i }))}
              />
            ))}
            {current.colours.length > 14 && <span className="more">+{current.colours.length - 14}</span>}
          </div>
          {!open && (
            <button type="button" className="rail-open" onClick={() => setOpen(true)} data-testid="rail-open">
              Customise
            </button>
          )}
        </div>
      )}

      {open && current && colour && (
        <div className="rail-panel" data-testid="rail-panel">
          <div className="panel-row">
            <span className="panel-label">Logo position</span>
            <div className="chips" role="group" aria-label="Logo position">
              {current.placements.map((pl) => (
                <button key={pl.id} type="button" aria-pressed={pl.id === placement} onClick={() => setPlacementBy((m) => ({ ...m, [current.printfulId]: pl.id }))}>
                  {pl.label}
                </button>
              ))}
            </div>
          </div>
          {colour.sizes.length > 1 && (
            <div className="panel-row">
              <span className="panel-label">Sizes</span>
              <span className="panel-value">{colour.sizes.join(" · ")}</span>
            </div>
          )}
          <div className="panel-row">
            <span className="panel-label">Your logo</span>
            {artwork ? (
              <span className="panel-value">{artwork.name}</span>
            ) : (
              <button type="button" className="link-button" onClick={openFilePicker}>
                Add your logo
              </button>
            )}
          </div>
          <div className="panel-actions">
            {THREE_D[current.printfulId] ? (
              <Link className="btn btn-primary" href={THREE_D[current.printfulId]}>
                Open in 3D
              </Link>
            ) : (
              <p className="panel-note">The exact proof for this position comes from Printful&apos;s print template. Ordering opens once it is connected.</p>
            )}
            <button type="button" className="link-button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
