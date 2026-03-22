"use client";

import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { SubscribeSection } from "@/components/landing/subscribe-section";
import { ReviewsSection } from "@/components/landing/reviews-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="app-layout">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SubscribeSection />
      <ReviewsSection />
      <Footer />
    </main>
  );
}
