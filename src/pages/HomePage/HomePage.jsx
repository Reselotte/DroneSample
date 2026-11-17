import HeroSection from "./HeroSection";
import SellPotentialSection from "./SellPotentialSection";
import ServiceTypesSection from "./ServiceTypesSection";

/** หน้าแรก (#/home) */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SellPotentialSection />
      <ServiceTypesSection />
    </>
  );
}
