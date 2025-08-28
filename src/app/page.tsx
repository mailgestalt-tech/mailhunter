import { Navbar } from '@/components/navbar';
import { HeroSection } from '@/components/hero-section';
import { HowItWorksSection } from '@/components/how-it-works-section';
import { FeaturesSection } from '@/components/features-section';
import { FaqSection } from '@/components/faq-section';
import { Footer } from '@/components/footer';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <Separator className="my-12 md:my-24" />
        <HowItWorksSection />
        <Separator className="my-12 md:my-24" />
        <FeaturesSection />
        <Separator className="my-12 md:my-24" />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
