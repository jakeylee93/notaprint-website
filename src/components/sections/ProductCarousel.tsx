"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const PRODUCTS = [
  { name: "Bamboo Stylus Pen", price: "£0.58", image: "/products/pen.png" },
  { name: "RPET Cooler Bag", price: "£5.22", image: "/products/orca-rpet-cooler.png" },
  { name: "Bamboo Lunch Box", price: "£6.26", image: "/products/double-stacked-bamboo.png" },
  { name: "Wood Ball Pen", price: "£11.81", image: "/products/unique-wood-ball.png" },
  { name: "Basic Ball Pen", price: "£0.30", image: "/products/bamboo-basic-ball.png" },
  { name: "Bamboo Stylus Pen", price: "£1.85", image: "/products/pen.png" },
  { name: "Custom Tote Bag", price: "£2.50", image: "/products/orca-rpet-cooler.png" },
  { name: "Custom T-Shirt", price: "£8.99", image: "/products/double-stacked-bamboo.png" },
];

export function ProductCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <section id="products" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <p className="text-cyan-500 text-sm font-semibold uppercase tracking-[0.2em] mb-3">
              Ready to Brand
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Popular Products
            </h2>
            <p className="text-gray-500 mt-2">Blank products waiting for your logo</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              aria-label="Scroll left"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-3 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              aria-label="Scroll right"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto no-scrollbar pb-4 snap-x snap-mandatory"
        >
          {PRODUCTS.map((product, i) => (
            <motion.div
              key={`${product.name}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex-shrink-0 w-[260px] snap-start group cursor-pointer"
            >
              {/* Product image */}
              <div className="bg-gray-50 rounded-2xl p-8 mb-4 aspect-square flex items-center justify-center group-hover:bg-gray-100 transition-colors duration-300 overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  width={200}
                  height={200}
                  className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Product info */}
              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
              <p className="text-gray-500 text-sm">from <span className="text-gray-900 font-semibold">{product.price}</span></p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
