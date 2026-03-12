"use client";

import { motion } from "framer-motion";

const STATS = [
  {
    label: "100+",
    sub: "Products",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
  },
  {
    label: "Fast",
    sub: "Turnaround",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 3.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "UK",
    sub: "Based",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3v18" />
      </svg>
    ),
  },
  {
    label: "Eco",
    sub: "Options",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9zm0 0c-2.25-2.97-3.38-5.97-3.38-9S9.75 5.97 12 3c2.25 2.97 3.38 5.97 3.38 9S14.25 18.03 12 21z" />
      </svg>
    ),
  },
  {
    label: "No",
    sub: "Minimums",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M6.75 6.75h10.5v10.5H6.75z" />
      </svg>
    ),
  },
];

export function TrustBar() {
  return (
    <section className="border-y border-slate-200 bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex flex-wrap items-center justify-between gap-6"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="min-w-[120px] flex-1 text-center">
              <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                {stat.icon}
              </div>
              <div className="text-2xl font-semibold text-slate-900 sm:text-3xl">{stat.label}</div>
              <div className="mt-1 text-sm text-slate-500">{stat.sub}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
