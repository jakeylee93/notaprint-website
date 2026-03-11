"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const products = [
  { id: 1, name: "Bamboo Stylus Pen", price: "£1.85", image: "/product-1.png", category: "Express" },
  { id: 2, name: "RPET Cooler Bag", price: "£5.22", image: "/product-2.jpg", category: "Express" },
  { id: 3, name: "Bamboo Lunch Box", price: "£6.26", image: "/product-3.jpg", category: "Express" },
  { id: 4, name: "Wooden Ball Pen", price: "£11.81", image: "/product-4.jpg", category: "Express" },
  { id: 5, name: "Bamboo Basic Pen", price: "£0.30", image: "/product-5.jpg", category: "Express" },
  { id: 6, name: "Custom T-Shirt", price: "From £8.50", image: "/product-1.png", category: "Bespoke" },
];

export function ProductCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      return () => el.removeEventListener("scroll", checkScroll);
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Featured Products
            </h2>
            <p className="text-lg text-gray-600 max-w-xl">
              Premium eco-friendly merchandise ready for your brand
            </p>
          </div>
          
          {/* Navigation Arrows */}
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`p-3 rounded-full border transition-all ${
                canScrollLeft
                  ? "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  : "border-gray-200 opacity-50 cursor-not-allowed"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`p-3 rounded-full border transition-all ${
                canScrollRight
                  ? "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  : "border-gray-200 opacity-50 cursor-not-allowed"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:-mx-0 sm:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-72 group"
            >
              {/* Image Container */}
              <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Category Badge */}
                <span className="absolute top-4 left-4 px-3 py-1 text-xs font-medium bg-white/90 backdrop-blur-sm rounded-full">
                  {product.category}
                </span>
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>

              {/* Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-gray-900">{product.price}</p>
                <Link
                  href="/quote"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Upload Logo
                  <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Scroll Indicator */}
        <div className="flex justify-center gap-2 mt-6 sm:hidden">
          {products.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-gray-300" />
          ))}
        </div>
      </div>
    </section>
  );
}
