import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const instrument = localFont({
  src: [
    { path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Nota Print · Upload your logo", template: "%s · Nota Print" },
  description: "Upload your logo once and see it on real products in true 3D. Proof it to the millimetre, then order made to order or in trade quantities.",
  // Preview build: keep it out of search indexes.
  robots: { index: false, follow: false },
  icons: { icon: "/brand/nota-mark.png", apple: "/brand/nota-mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${instrument.variable} ${GeistSans.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AppShell>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </AppShell>
      </body>
    </html>
  );
}
