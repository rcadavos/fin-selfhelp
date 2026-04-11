"use client";

import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { HighlightsSection } from "@/components/landing/highlights-section";
import { BuiltForSection } from "@/components/landing/built-for-section";
import { SubscribeSection } from "@/components/landing/subscribe-section";
import { FaqSection } from "@/components/landing/faq-section";
import { ReviewsSection } from "@/components/landing/reviews-section";
import { CtaBandSection } from "@/components/landing/cta-band-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="app-layout">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <HighlightsSection />
      <BuiltForSection />
      <SubscribeSection />
      <FaqSection />
      <ReviewsSection />
      <CtaBandSection />
      <Footer />
    </main>
  );
}
