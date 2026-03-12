import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#0a0f1c] text-white/60 pt-16 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Image src="/logo.png" alt="NotAPrint" width={120} height={34} className="h-8 w-auto mb-4 brightness-0 invert" />
            <p className="text-sm leading-relaxed">
              Custom printing and branded merchandise. Upload your logo, choose your products, we deliver.
            </p>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Products</h4>
            <ul className="space-y-2.5">
              <li><Link href="/products/merchandise" className="text-sm hover:text-white transition-colors">Merchandise</Link></li>
              <li><Link href="/products/large-format" className="text-sm hover:text-white transition-colors">Large Format</Link></li>
              <li><Link href="/products/print" className="text-sm hover:text-white transition-colors">Print</Link></li>
              <li><Link href="/products" className="text-sm hover:text-white transition-colors">All Products</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-sm hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="#" className="text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-sm hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Get in Touch</h4>
            <ul className="space-y-2.5">
              <li className="text-sm">hello@notaprint.co.uk</li>
              <li className="text-sm">notaprint.co.uk</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} NotAPrint. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
