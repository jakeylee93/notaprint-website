"use client";

import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="NotAPrint" width={120} height={40} className="h-10 w-auto" priority />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/products" className="text-sm font-medium text-gray-600 hover:text-gray-900">Products</Link>
            <Link href="/services" className="text-sm font-medium text-gray-600 hover:text-gray-900">Services</Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900">About</Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900">Contact</Link>
          </nav>
          <Link href="/quote" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            Get a Quote
          </Link>
        </div>
      </div>
    </header>
  );
}
