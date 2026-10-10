import Link from "next/link";
import { PRICING_CONFIG } from "@/lib/pricing/config";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack-m">
            <span className="wordmark">
              Nota <em>Print</em>
            </span>
            <p className="muted small" style={{ maxWidth: "36ch", margin: 0 }}>
              Your logo on real products, proofed to the millimetre. Made to order, or in trade quantities.
            </p>
          </div>
          <nav className="footer-links" aria-label="Shop">
            <Link href="/#products">Products</Link>
            <Link href="/#trade">Trade quantities</Link>
            <Link href="/#proof">Proof before print</Link>
          </nav>
          <nav className="footer-links" aria-label="Your order">
            <Link href="/basket">Basket</Link>
            <Link href="/quote">Trade quote</Link>
          </nav>
        </div>
        <p className="preview-note">
          Preview build. {PRICING_CONFIG.vatNote} Checkout runs in Stripe test mode only, and no supplier orders are ever placed. 3D views use original
          prototype models. Uploaded logos are processed and stored on your device only.
        </p>
      </div>
    </footer>
  );
}
