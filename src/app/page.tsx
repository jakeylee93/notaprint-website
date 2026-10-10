import Link from "next/link";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductGrid";
import { ProofShowcase } from "@/components/ProofShowcase";

export default function Home() {
  return (
    <>
      <Hero />

      <section id="products" className="section-tight" aria-labelledby="products-title">
        <div className="container">
          <div className="section-head">
            <h2 id="products-title" className="display-l">
              Products
            </h2>
            <p className="lead">Your logo on every product. Rotate any of them in 3D, then proof the print.</p>
          </div>
          <ProductGrid />
        </div>
      </section>

      <section id="trade" className="section band-paper" aria-labelledby="trade-title">
        <div className="container">
          <h2 id="trade-title" className="sr-only">
            Two ways to order
          </h2>
          <div className="split">
            <div className="stack-m">
              <p className="display-m">Made to order.</p>
              <p className="lead">
                One mug, or fifty. Printed when you order by our fulfilment partner, with no minimum. Shown with demo prices in this preview, checked again by the
                server before checkout.
              </p>
              <Link className="link" href="/products/white-glossy-mug">
                Start with the white glossy mug
              </Link>
            </div>
            <div className="stack-m">
              <p className="display-m">Trade quantities.</p>
              <p className="lead">
                A thousand pens or a hundred totes, priced in breaks. Configure and proof here, then we prepare a quote. Prices shown are indicative until it is
                confirmed in writing.
              </p>
              <Link className="link" href="/products/ballpoint-pen">
                Configure pens for a quote
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="proof" className="section" aria-labelledby="proof-title">
        <div className="container">
          <div className="section-head">
            <h2 id="proof-title" className="display-l">
              Proof before print.
            </h2>
            <p className="lead">
              Every order starts with a flat proof at real size: the printable area, your logo&apos;s dimensions in millimetres and a resolution check. Nothing goes
              to print until you approve it.
            </p>
          </div>
          <ProofShowcase />
        </div>
      </section>
    </>
  );
}
