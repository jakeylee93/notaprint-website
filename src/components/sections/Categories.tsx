"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const CATEGORIES = [
  {
    title: "Merchandise",
    description: "Wearables, drinkware, stationery, and giveaway products ready for your brand.",
    items: "T-Shirts • Tote Bags • Pens • Caps • Mugs • Bottles",
    image: "/products/merch-hero.jpg",
    href: "/products/merchandise",
    className: "md:col-span-8 md:row-span-2",
    accent: "from-cyan-500/80 to-blue-500/80",
  },
  {
    title: "Large Format",
    description: "Posters, signage, and event display materials built for visibility.",
    items: "Banners • Stands • Posters",
    image: "/products/largeformat-hero.jpg",
    href: "/products/large-format",
    className: "md:col-span-4",
    accent: "from-slate-900/70 to-slate-700/70",
  },
  {
    title: "Print",
    description: "Business cards, flyers, brochures, and office-ready essentials.",
    items: "Cards • Flyers • Brochures",
    image: "/products/print-hero.jpg",
    href: "/products/print",
    className: "md:col-span-4",
    accent: "from-cyan-600/75 to-indigo-600/70",
  },
];

export function Categories() {
  return (
    <section id="categories" className="bg-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-end"
        >
          <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Print Categories Built For
            <span className="block text-slate-500">Campaigns, Teams, and Retail Drops</span>
          </h2>
          <p className="text-slate-500">
            We grouped everything into three lanes so you can browse faster and mix products in one quote.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-12 md:grid-rows-2">
          {CATEGORIES.map((category, i) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={category.className}
            >
              <Link href={category.href} className="group relative block h-full overflow-hidden rounded-[2rem]">
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${category.accent}`} />
                <div className="absolute inset-0 bg-black/15" />

                <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
                  <h3 className="text-2xl font-semibold text-white sm:text-3xl">{category.title}</h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85">{category.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/70">{category.items}</p>
                  <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-sm text-white backdrop-blur-sm transition group-hover:bg-white/15">
                    Browse {category.title}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
