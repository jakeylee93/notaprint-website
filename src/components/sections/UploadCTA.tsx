"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const MOCK_FILES = ["logo-final.svg", "brand-guide.pdf", "print-assets.zip"];

export function UploadCTA() {
  return (
    <section id="upload" className="relative overflow-hidden bg-[#081120] px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-[130px]" />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Upload + Launch</p>
          <h2 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Drop Your Logo.
            <span className="block bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
              Start Printing Today.
            </span>
          </h2>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Send your design once and we map it across every selected product with live proofs and tier pricing.
          </p>

          <Link
            href="#"
            className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-cyan-500 px-10 py-5 text-lg font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Your Logo Now
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-lg"
        >
          <div className="rounded-2xl border-2 border-dashed border-cyan-200/60 bg-[#0a1730]/80 p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-white/75">Upload queue</p>
              <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs text-cyan-200">Auto-processing</span>
            </div>

            <div className="space-y-3">
              {MOCK_FILES.map((file, index) => (
                <motion.div
                  key={file}
                  initial={{ opacity: 0.35, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.18 + index * 0.12 }}
                  className="rounded-xl border border-white/15 bg-white/5 p-3"
                >
                  <p className="text-sm text-white">{file}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: "0%" }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.35 + index * 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-300"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
