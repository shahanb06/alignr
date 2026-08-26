import Nav from './Nav';
import Hero from './Hero';
import HeroShowcase from './HeroShowcase';
import FeatureReason from './FeatureReason';
import FeatureRecruiter from './FeatureRecruiter';
import WhyAlignr from './WhyAlignr';
import Faq from './Faq';
import ClosingCta from './ClosingCta';
import Footer from './Footer';

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper font-sans text-charcoal antialiased">
      <Nav />
      <main>
        <Hero />
        <HeroShowcase />
        <FeatureReason />
        <FeatureRecruiter />
        <WhyAlignr />
        <Faq />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
