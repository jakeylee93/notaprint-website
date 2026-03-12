"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

type Product = {
  name: string;
  fromPrice: string;
  image: string;
  tiers: {
    qty: string;
    price: string;
  }[];
};

const PRODUCTS: Product[] = [
  {
    name: "Bamboo Stylus Pen",
    fromPrice: "£0.58",
    image: "/products/pen.png",
    tiers: [
      { qty: "50", price: "£0.45" },
      { qty: "100", price: "£0.38" },
      { qty: "500", price: "£0.30" },
    ],
  },
  {
    name: "RPET Cooler Bag",
    fromPrice: "£5.22",
    image: "/products/orca-rpet-cooler.png",
    tiers: [
      { qty: "50", price: "£4.95" },
      { qty: "100", price: "£4.62" },
      { qty: "500", price: "£4.28" },
    ],
  },
  {
    name: "Bamboo Lunch Box",
    fromPrice: "£6.26",
    image: "/products/double-stacked-bamboo.png",
    tiers: [
      { qty: "50", price: "£5.94" },
      { qty: "100", price: "£5.61" },
      { qty: "500", price: "£5.17" },
    ],
  },
  {
    name: "Wood Ball Pen",
    fromPrice: "£11.81",
    image: "/products/unique-wood-ball.png",
    tiers: [
      { qty: "50", price: "£11.42" },
      { qty: "100", price: "£10.88" },
      { qty: "500", price: "£10.20" },
    ],
  },
  {
    name: "Basic Ball Pen",
    fromPrice: "£0.30",
    image: "/products/bamboo-basic-ball.png",
    tiers: [
      { qty: "50", price: "£0.27" },
      { qty: "100", price: "£0.24" },
      { qty: "500", price: "£0.20" },
    ],
  },
  {
    name: "Classic Tote Bag",
    fromPrice: "£2.50",
    image: "/products/orca-rpet-cooler.png",
    tiers: [
      { qty: "50", price: "£2.31" },
      { qty: "100", price: "£2.15" },
      { qty: "500", price: "£1.96" },
    ],
  },
];

export function ProductCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -360 : 360;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <section id="products" className="bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-600">Ready to Brand</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">Popular Products</h2>
            <p className="mt-3 max-w-2xl text-slate-500">
              All products are shown on pure white for realistic previews. Hover a product to view quantity-based pricing tiers.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => scroll("left")}
              className="rounded-xl border border-slate-200 p-3 text-slate-600 transition hover:bg-slate-50"
              aria-label="Scroll left"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              className="rounded-xl border border-slate-200 p-3 text-slate-600 transition hover:bg-slate-50"
              aria-label="Scroll right"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>

        <div ref={scrollRef} className="no-scrollbar flex snap-x snap-mandatory gap-8 overflow-x-auto pb-4">
          {PRODUCTS.map((product, i) => (
            <motion.article
              key={`${product.name}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group w-[300px] flex-shrink-0 snap-start"
            >
              <div className="relative mb-5 flex aspect-[1/1] items-center justify-center overflow-hidden bg-white">
                <Image
                  src={product.image}
                  alt={product.name}
                  width={280}
                  height={280}
                  className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition duration-300 group-hover:bg-slate-900/35 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Add your logo
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                from <span className="font-semibold text-slate-900">{product.fromPrice} / unit</span>
              </p>

              <div className="mt-3 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Hover for quantity pricing</p>
                <div className="mt-2 max-h-0 overflow-hidden rounded-xl border border-transparent p-0 opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:border-cyan-300 group-hover:bg-cyan-50/40 group-hover:p-3 group-hover:opacity-100">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-700">Pricing Tiers</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {product.tiers.map((tier) => (
                    <span key={`${product.name}-${tier.qty}`}>
                      {tier.qty}: <span className="font-semibold text-slate-800">{tier.price}</span>
                    </span>
                  ))}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
