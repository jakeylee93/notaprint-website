import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Categories } from "@/components/sections/Categories";
import { ProductCarousel } from "@/components/sections/ProductCarousel";
import { UploadCTA } from "@/components/sections/UploadCTA";
import { TrustBar } from "@/components/sections/TrustBar";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <HowItWorks />
        <Categories />
        <ProductCarousel />
        <UploadCTA />
        <TrustBar />
      </main>
      <Footer />
    </>
  );
}
