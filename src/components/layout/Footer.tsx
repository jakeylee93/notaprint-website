import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Image src="/logo.png" alt="NotAPrint" width={140} height={47} className="h-12 w-auto brightness-0 invert" />
            <p className="mt-4 text-sm text-gray-400 max-w-sm">Custom printing and merchandise for businesses. Quality products, fast turnaround.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white uppercase">Products</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/products" className="text-sm hover:text-white">Merchandise</Link></li>
              <li><Link href="/products" className="text-sm hover:text-white">Large Format</Link></li>
              <li><Link href="/products" className="text-sm hover:text-white">Print</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white uppercase">Company</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/about" className="text-sm hover:text-white">About</Link></li>
              <li><Link href="/contact" className="text-sm hover:text-white">Contact</Link></li>
              <li><Link href="/quote" className="text-sm hover:text-white">Get a Quote</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-gray-500">© 2026 NotAPrint. All rights reserved.</div>
      </div>
    </footer>
  );
}
