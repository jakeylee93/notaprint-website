import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { TwoPathsSection } from "@/components/sections/TwoPathsSection";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <TwoPathsSection />
      </main>
      <Footer />
    </>
  );
}
