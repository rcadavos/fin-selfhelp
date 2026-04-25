import dynamic from "next/dynamic";
import { Header } from "@/components/landing/header";
import { PageViewTracker } from "@/components/landing/page-view-tracker";
import { HeroSection } from "@/components/landing/hero-section";

const FeaturesSection = dynamic(() => import("@/components/landing/features-section").then(m => m.FeaturesSection));
const HowItWorksSection = dynamic(() => import("@/components/landing/how-it-works-section").then(m => m.HowItWorksSection));
const StatsSection = dynamic(() => import("@/components/landing/stats-section").then(m => m.StatsSection));
const HighlightsSection = dynamic(() => import("@/components/landing/highlights-section").then(m => m.HighlightsSection));
const BuiltForSection = dynamic(() => import("@/components/landing/built-for-section").then(m => m.BuiltForSection));
const SubscribeSection = dynamic(() => import("@/components/landing/subscribe-section").then(m => m.SubscribeSection));
const FaqSection = dynamic(() => import("@/components/landing/faq-section").then(m => m.FaqSection));
const CtaBandSection = dynamic(() => import("@/components/landing/cta-band-section").then(m => m.CtaBandSection));
const Footer = dynamic(() => import("@/components/landing/footer").then(m => m.Footer));
import { getSubscriptionPlans } from "@/actions/subscription-plan";
import { SUBSCRIPTION_PLAN_FALLBACK, SUBSCRIPTION_PREMIUM_FALLBACK } from "@/lib/query/subscription-plan";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({ path: "/" });

export const revalidate = 3600; // Revalidate every hour

export default async function HomePage() {
  const plansRow = await getSubscriptionPlans();
  const proPlan = plansRow.pro ?? SUBSCRIPTION_PLAN_FALLBACK;
  const premiumPlan = plansRow.premium ?? SUBSCRIPTION_PREMIUM_FALLBACK;

  return (
    <main className="app-layout">
      <PageViewTracker />
      <Header />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <HighlightsSection />
      <BuiltForSection />
      <SubscribeSection proPlan={proPlan} premiumPlan={premiumPlan} />
      <FaqSection />
      <CtaBandSection />
      <Footer />
    </main>
  );
}
