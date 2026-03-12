"use client";

import { motion } from "framer-motion";

const STATS = [
  { label: "100+", sub: "Products" },
  { label: "Fast", sub: "Turnaround" },
  { label: "UK", sub: "Based" },
  { label: "Eco", sub: "Options" },
  { label: "No", sub: "Minimums" },
];

export function TrustBar() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-between flex-wrap gap-8"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center flex-1 min-w-[100px]">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.label}</div>
              <div className="text-gray-400 text-sm mt-1">{stat.sub}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
