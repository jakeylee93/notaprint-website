"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    title: "Upload Logo",
    description: "Drop in your artwork once and we optimize file quality automatically.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Choose Products",
    description: "Apply your logo across merch, print, and large-format in one place.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Get Delivered",
    description: "Production starts instantly and arrives quickly to your door.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-semibold text-slate-900 sm:text-4xl"
          >
            Three Steps. One Flow.
          </motion.h2>
          <p className="max-w-xl text-slate-500">No endless forms. Upload once, choose what you need, and we handle production and fulfilment.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:gap-0">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="relative rounded-2xl border border-slate-200/80 bg-white p-5 md:rounded-none md:border-y md:p-6 md:first:rounded-l-2xl md:first:border-l md:last:rounded-r-2xl md:last:border-r"
            >
              {i < STEPS.length - 1 && (
                <div className="pointer-events-none absolute right-0 top-1/2 hidden h-[1px] w-10 translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-300 to-blue-400 md:block" />
              )}
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                {step.icon}
              </div>
              <p className="text-xs font-semibold tracking-[0.25em] text-cyan-600">{step.number}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
