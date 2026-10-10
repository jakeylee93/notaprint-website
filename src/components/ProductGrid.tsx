"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PRODUCTS } from "@/lib/catalog/products";
import type { Category, Fulfilment, Product } from "@/lib/catalog/types";
import { PRICING_CONFIG, formatPenceExact } from "@/lib/pricing/config";
import { gridPrice } from "@/lib/pricing/price";
import { useDisplayArtwork, useArtwork } from "@/state/artwork";
import { designsStore, defaultsFor } from "@/state/designs";
import { useStore } from "@/state/store";
import { composeDesign, resolveDesign } from "./design-utils";
import { useInView } from "./useReducedMotion";

const CATEGORIES: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "drinkware", label: "Drinkware" },
  { id: "writing", label: "Writing" },
  { id: "bags", label: "Bags" },
  { id: "stationery", label: "Stationery" },
];
const FULFILMENT: { id: Fulfilment | "all"; label: string }[] = [
  { id: "all", label: "Any" },
  { id: "made-to-order", label: "Made to order" },
  { id: "trade-quote", label: "Trade quantities" },
];
const QUANTITIES = [1, 25, 100, 500];
type Sort = "recommended" | "price-asc" | "price-desc" | "lead" | "name";

const COLOUR_FAMILIES = [
  { id: "white", label: "White", hex: "#f6f6f4", match: ["white"] },
  { id: "black", label: "Black", hex: "#1c1c1e", match: ["black"] },
  { id: "natural", label: "Natural", hex: "#e9e1d0", match: ["natural", "stone"] },
  { id: "navy", label: "Navy", hex: "#1f2a44", match: ["navy"] },
  { id: "steel", label: "Steel", hex: "#b9bcc0", match: ["steel"] },
];

export function ProductGrid() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [fulfilment, setFulfilment] = useState<Fulfilment | "all">("all");
  const [colour, setColour] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sort, setSort] = useState<Sort>("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    const family = COLOUR_FAMILIES.find((c) => c.id === colour);
    const list = PRODUCTS.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (fulfilment === "all" || p.fulfilment === fulfilment) &&
        (!family || p.colours.some((c) => family.match.includes(c.id))) &&
        (!q || `${p.name} ${p.summary} ${p.category}`.toLowerCase().includes(q)),
    );
    const price = (p: Product) => gridPrice(p, qty).unitPence;
    const lead = (p: Product) => (p.fulfilment === "made-to-order" ? 0 : 1);
    return [...list].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return price(a) - price(b);
        case "price-desc":
          return price(b) - price(a);
        case "lead":
          return lead(a) - lead(b) || a.sortWeight - b.sortWeight;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return a.sortWeight - b.sortWeight;
      }
    });
  }, [query, category, fulfilment, colour, qty, sort]);

  const activeFilters = (category !== "all" ? 1 : 0) + (fulfilment !== "all" ? 1 : 0) + (colour ? 1 : 0);

  return (
    <div>
      <div className={`filters ${filtersOpen ? "open" : ""}`} role="search" aria-label="Filter products">
        <label className="sr-only" htmlFor="product-search">
          Search products
        </label>
        <input id="product-search" className="search" type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className="chip filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
          Filter &amp; sort{activeFilters ? ` (${activeFilters})` : ""}
        </button>
        <div className="filter-group collapsible" role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="filter-group collapsible" role="group" aria-label="How it's made">
          {FULFILMENT.map((f) => (
            <button key={f.id} type="button" className="chip" aria-pressed={fulfilment === f.id} onClick={() => setFulfilment(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="filter-group collapsible" role="group" aria-label="Colour">
          <span className="filter-label">Colour</span>
          {COLOUR_FAMILIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="swatch"
              style={{ background: c.hex, width: 26, height: 26 }}
              aria-pressed={colour === c.id}
              aria-label={c.label}
              title={undefined}
              onClick={() => setColour((cur) => (cur === c.id ? null : c.id))}
            />
          ))}
        </div>
        <div className="filter-group collapsible" role="group" aria-label="Quantity for pricing">
          <span className="filter-label">Price for</span>
          {QUANTITIES.map((n) => (
            <button key={n} type="button" className="chip" aria-pressed={qty === n} onClick={() => setQty(n)}>
              {n.toLocaleString("en-GB")}
            </button>
          ))}
        </div>
        <div className="filter-group collapsible">
          <label className="sr-only" htmlFor="product-sort">
            Sort
          </label>
          <select id="product-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recommended">Recommended</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="lead">Quickest first</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>
      {products.length === 0 ? (
        <div className="empty">
          <p className="display-s">Nothing matches those filters.</p>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setFulfilment("all");
              setColour(null);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ThumbnailGrid products={products} qty={qty} />
      )}
    </div>
  );
}

function ThumbnailGrid({ products, qty }: { products: Product[]; qty: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, "600px");
  const display = useDisplayArtwork();
  const { artwork } = useArtwork();
  const designs = useStore(designsStore);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const keysRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!inView || !display) return;
    let cancelled = false;
    (async () => {
      const { getBaker } = await import("@/three/baker");
      const { webglAvailable } = await import("@/three/core");
      if (!webglAvailable()) return;
      const baker = getBaker();
      baker.keepOnly(display.id);
      for (const p of PRODUCTS) {
        if (cancelled) return;
        const prefs = designs[p.id] ?? defaultsFor(p);
        const d = resolveDesign(p, prefs, display.aspect);
        const key = `${display.id}|${p.id}|${d.variant.id}|${d.colour.id}|${d.placement.id}|${d.fitted.widthMm}|${d.fitted.offsetYmm}`;
        if (keysRef.current[p.id] === key) continue;
        const composed = composeDesign(d, display.bitmap, undefined, 7);
        try {
          const url = await baker.bake(key, p, d.variant, d.colour.hex, composed.canvas);
          if (cancelled) return;
          keysRef.current[p.id] = key;
          setUrls((u) => ({ ...u, [p.id]: url }));
        } catch {
          /* leave the placeholder */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inView, display, designs]);

  return (
    <div className="product-grid" ref={ref} data-testid="product-grid">
      {products.map((p) => {
        const price = gridPrice(p, qty);
        const label = p.fulfilment === "made-to-order" ? PRICING_CONFIG.priceLabel : "Indicative";
        return (
          <Link key={p.id} href={`/products/${p.slug}`} className="card" data-testid={`card-${p.id}`}>
            <div className="card-image">
              {urls[p.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p.id]} alt={`${p.name} preview with ${artwork ? "your logo" : "a placeholder logo"}`} data-artwork={display?.id} />
              ) : (
                <span className="pending" aria-hidden="true" />
              )}
            </div>
            <div className="card-meta">
              <h3 className="card-title">{p.name}</h3>
              <span className="card-price tabular">
                {formatPenceExact(price.unitPence)} each at {price.qty.toLocaleString("en-GB")}
                {price.qty > qty ? " (minimum)" : ""}
              </span>
              <span>
                {p.fulfilment === "made-to-order" ? "Made to order" : "Trade quote"} · {label}
              </span>
              <span className="dots" aria-label={`Colours: ${p.colours.map((c) => c.label).join(", ")}`}>
                {p.colours.map((c) => (
                  <span key={c.id} className="dot" style={{ background: c.hex }} />
                ))}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
