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
import { getSubscriptionPlans } from "@/actions/subscription-plan";
import { getApprovedReviews } from "@/actions/feedback";
import { SUBSCRIPTION_PLAN_FALLBACK, SUBSCRIPTION_PREMIUM_FALLBACK } from "@/lib/query/subscription-plan";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [plansRow, reviewsResult] = await Promise.all([getSubscriptionPlans(), getApprovedReviews()]);
  const proPlan = plansRow.pro ?? SUBSCRIPTION_PLAN_FALLBACK;
  const premiumPlan = plansRow.premium ?? SUBSCRIPTION_PREMIUM_FALLBACK;
  const reviews = reviewsResult.error ? [] : reviewsResult.reviews;

  return (
    <main className="app-layout">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <HighlightsSection />
      <BuiltForSection />
      <SubscribeSection proPlan={proPlan} premiumPlan={premiumPlan} />
      <FaqSection />
      <ReviewsSection reviews={reviews} />
      <CtaBandSection />
      <Footer />
    </main>
  );
}
