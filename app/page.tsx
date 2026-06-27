import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import DashboardPreview from '@/components/landing/DashboardPreview';
import TradiaMethod from '@/components/landing/TradiaMethod';
import HowItWorks from '@/components/landing/HowItWorks';
import PlatformStats from '@/components/landing/PlatformStats';
import Features from '@/components/landing/Features';
import ExploreSection from '@/components/landing/ExploreSection';
import MidCTA from '@/components/landing/MidCTA';
import WhyTradersFail from '@/components/landing/WhyTradersFail';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <LandingNav />
      <Hero />
      <DashboardPreview />
      <TradiaMethod />
      <HowItWorks />
      <PlatformStats />
      <Features />
      <ExploreSection />
      <MidCTA />
      <WhyTradersFail />
      <Pricing />
      <Testimonials />
      <Footer />
    </div>
  );
}
