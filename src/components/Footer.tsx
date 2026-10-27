import Link from "next/link";
import { Wordmark } from "./Header";
import { PRICING_CONFIG } from "@/lib/pricing/config";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="stack-m">
            <Wordmark size={56} />
            <p className="muted small" style={{ maxWidth: "36ch", margin: 0 }}>
              Your logo on real products, proofed to the millimetre. Made to order, or in trade quantities.
            </p>
          </div>
          <nav className="footer-links" aria-label="Shop">
            <Link href="/#shop">Shop</Link>
            <Link href="/quote">Trade quantities</Link>
          </nav>
          <nav className="footer-links" aria-label="Your order">
            <Link href="/basket">Basket</Link>
            <Link href="/quote">Trade quote</Link>
          </nav>
        </div>
        <p className="preview-note">
          Preview build. {PRICING_CONFIG.vatNote} Checkout runs in Stripe test mode only, and no supplier orders are ever placed. The mug is shown in real 3D; other products use Printful&apos;s own catalogue photography until their 3D models are ready. Uploaded logos stay on your device.
        </p>
      </div>
    </footer>
  );
}
