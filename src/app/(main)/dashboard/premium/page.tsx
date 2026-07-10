"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Gem,
  Building2,
  Wallet,
  ChevronRight,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentHeader } from "@/components/app/content-header";
import { useSuspenseQuery } from "@tanstack/react-query";
import { subscriptionStatusQueryOptions } from "@/lib/query/subscription-user";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

const premiumFeatures = [
  {
    title: "Rent Tracker",
    description: "Manage your properties, tenants and track rent payments with ease.",
    icon: Building2,
    href: "/dashboard/rent-tracker",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    title: "Payment Tracker",
    description: "Track all your miscellaneous payments and planned expenses in one place.",
    icon: Wallet,
    href: "/dashboard/payment-tracker",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
];

function PremiumPageContent() {
  const { data: subscriptionStatus } = useSuspenseQuery(subscriptionStatusQueryOptions());
  const isPremium = subscriptionStatus?.hasPremiumAccess || subscriptionStatus?.hasProAccess;

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-20 pt-4">
      <ContentHeader
        title="Premium Features"
        subtitle="Exclusive tools to help you manage your finances even better."
        icon={Gem}
        className="mb-8"
      />

      {!isPremium && (
        <Card className="mb-8 border-primary/50 bg-primary/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-10 -mt-10" />
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Limited Access</span>
            </div>
            <CardTitle className="text-2xl mt-2">Unlock the full power of OmniTrak</CardTitle>
            <CardDescription className="text-base text-foreground/80 mt-2">
              Upgrade to Pro or Premium to access advanced tracking tools and more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 mb-6">
              {[
                "Unlimited Goal Tracking",
                "Advanced Rent Management",
                "Payment History Analytics",
                "Priority Support"
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/account/subscription/payment">
                Explore Plans <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {premiumFeatures.map((feature) => (
          <Link key={feature.title} href={feature.href}>
            <Card className="h-full transition-all hover:border-primary/30 group">
              <CardHeader>
                <div className={`p-3 rounded-lg w-fit ${feature.bg} mb-2`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {feature.title}
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <PremiumPageContent />
    </Suspense>
  );
}
