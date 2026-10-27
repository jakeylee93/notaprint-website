"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useShell } from "./AppShell";
import { LogoChip } from "./LogoChip";
import { useArtwork } from "@/state/artwork";
import { useBasket } from "@/state/basket";

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="wordmark">
      {/* Genuine Nota mark, original source pixels (no redraw). The name is plain interface type, not brand lettering. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wordmark-mark" src="/brand/nota-mark.png" alt="" width={size} height={size} />
      <span>Nota Print</span>
    </span>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { openFilePicker } = useShell();
  const artwork = useArtwork();
  const basket = useBasket();
  const count = basket.lines.length;
  const quoteCount = basket.quote.length;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const nav = [
    { href: "/#shop", label: "Shop" },
    { href: "/quote", label: quoteCount > 0 ? `Trade (${quoteCount})` : "Trade" },
  ];

  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" aria-label="Nota Print home">
          <Wordmark />
        </Link>
        <nav className="nav" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {artwork.artwork ? (
            <LogoChip compact />
          ) : (
            <button type="button" className="header-upload" onClick={openFilePicker} disabled={artwork.status === "processing"} data-testid="header-upload">
              {artwork.status === "processing" ? "Preparing…" : "Add your logo"}
            </button>
          )}
          <Link className="basket-link" href="/basket" aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`} data-testid="basket-link">
            <span className="label-wide">Basket</span>
            <span className="count">{count}</span>
          </Link>
          <button type="button" className="menu-button" aria-expanded={open} aria-controls="menu-sheet" onClick={() => setOpen((o) => !o)}>
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" /> : <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.6" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-sheet" className="menu-sheet" aria-label="Menu">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <Link href="/basket" onClick={() => setOpen(false)}>
            Basket ({count})
          </Link>
        </nav>
      )}
    </header>
  );
}
