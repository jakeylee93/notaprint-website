"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const CATEGORIES = [
  {
    title: "Merchandise",
    description: "T-shirts, hats, bags, pens, drinkware, and 50+ more branded products for your team or customers.",
    items: "T-Shirts • Tote Bags • Pens • Caps • Mugs • Lanyards",
    image: "/products/merch-hero.jpg",
    href: "/products/merchandise",
    color: "from-cyan-500 to-blue-500",
  },
  {
    title: "Large Format",
    description: "Banners, posters, signage, exhibition stands, and display materials that make an impact.",
    items: "Banners • Posters • Signage • Pull-Up Stands • Backdrops",
    image: "/products/largeformat-hero.jpg",
    href: "/products/large-format",
    color: "from-blue-500 to-indigo-500",
  },
  {
    title: "Print",
    description: "Business cards, flyers, brochures, letterheads, and everything your office needs.",
    items: "Business Cards • Flyers • Brochures • Stationery • Menus",
    image: "/products/print-hero.jpg",
    href: "/products/print",
    color: "from-indigo-500 to-purple-500",
  },
];

export function Categories() {
  return (
    <section id="categories" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-cyan-500 text-sm font-semibold uppercase tracking-[0.2em] mb-3">
            Our Services
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            What We Print
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <Link href={cat.href} className="group block">
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  {/* Gradient header */}
                  <div className={`h-48 bg-gradient-to-br ${cat.color} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10" />
                    <h3 className="relative text-2xl font-bold text-white">{cat.title}</h3>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-gray-600 mb-4 leading-relaxed">{cat.description}</p>
                    <p className="text-sm text-gray-400 mb-4">{cat.items}</p>
                    <span className="text-cyan-500 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Browse {cat.title}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
