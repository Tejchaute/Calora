import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { IndustryStrip } from '@/components/landing/IndustryStrip';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingMotionProvider } from '@/components/landing/LandingMotion';

export function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#FAF9F7] text-[#172033] selection:bg-[#5146D8]/15"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-[#172033] px-4 py-2 text-sm font-semibold text-white transition-transform motion-reduce:transition-none focus:translate-y-0"
      >
        Skip to content
      </a>
      <LandingMotionProvider>
        <LandingHeader />
        <main id="main-content">
          <HeroSection />
          <FeatureShowcase />
          <ProblemSection />
          <HowItWorks />
          <IndustryStrip />
          <ContactSection />
          <FAQSection />
          <FinalCTA />
        </main>
        <LandingFooter />
      </LandingMotionProvider>
    </div>
  );
}
