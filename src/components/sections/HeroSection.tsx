"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const MOCKUPS = [
  { label: "T-Shirt", symbol: "👕", delay: 0 },
  { label: "Mug", symbol: "☕", delay: 0.15 },
  { label: "Pen", symbol: "🖊️", delay: 0.3 },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[108vh] overflow-hidden bg-[#070d1a] text-white">
      <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-[140px]" />
      <div className="absolute -right-20 bottom-20 h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-[150px]" />
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white/10 to-transparent" />

      <div className="relative z-10 mx-auto grid min-h-[108vh] max-w-7xl items-center gap-12 px-4 pb-24 pt-32 sm:px-6 lg:grid-cols-2 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="max-w-xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            Instant Mockups + Tiered Pricing
          </div>

          <h1 className="text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
            Your Logo.
            <span className="block bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
              Every Product.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
            Upload your design once and preview it across merchandise, print, and large-format products in one clean workflow.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="#upload"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
            >
              Upload Your Logo
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="#products"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-8 py-4 text-base font-medium text-white/90 transition hover:bg-white/10"
            >
              Explore Products
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1 }}
          className="relative"
        >
          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-white/70">Live Product Mockup</p>
              <p className="text-sm font-medium text-cyan-300">Logo Area Preview</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {MOCKUPS.map((item) => (
                <motion.div
                  key={item.label}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, delay: item.delay, ease: "easeInOut" }}
                  className="rounded-2xl border border-white/20 bg-[#0b1428]/80 p-4"
                >
                  <div className="mb-3 flex items-center justify-between text-sm text-white/80">
                    <span>{item.label}</span>
                    <span>{item.symbol}</span>
                  </div>
                  <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-cyan-300/60 bg-white/5 text-xs uppercase tracking-[0.2em] text-cyan-200">
                    Your Logo
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="rounded-full border border-white/20 px-3 py-1">No setup fee</span>
              <span className="rounded-full border border-white/20 px-3 py-1">Fast UK delivery</span>
              <span className="rounded-full border border-white/20 px-3 py-1">100+ SKUs</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
