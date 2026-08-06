"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentHeader } from "@/components/app/content-header";
import { adminUsersQueryOptions } from "@/lib/query/admin-users";
import { Users, Tags, CreditCard, Gift, MessageSquareText, Lightbulb, Loader2, Bell } from "lucide-react";

const sections = [
  {
    href: "/admin/users",
    title: "Users",
    description: "Accounts, Pro / Premium subscriptions, and admin flags.",
    icon: Users,
  },
  {
    href: "/admin/categories",
    title: "Categories",
    description: "Expense categories shown in the app.",
    icon: Tags,
  },
  {
    href: "/admin/pricing",
    title: "Pricing",
    description: "Pro and Premium list prices for checkout and landing.",
    icon: CreditCard,
  },
  {
    href: "/admin/referrals",
    title: "Referrals",
    description: "Referral counts, conversions, and free Pro months granted.",
    icon: Gift,
  },
  {
    href: "/admin/reviews",
    title: "Reviews",
    description: "Moderate user reviews for the marketing site.",
    icon: MessageSquareText,
  },
  {
    href: "/admin/suggestions",
    title: "Suggestions",
    description: "Product feedback from subscribers.",
    icon: Lightbulb,
  },
  {
    href: "/admin/logs",
    title: "Reminder Logs",
    description: "Reminder emails and in-app notification debug view.",
    icon: Bell,
  },
] as const;

function AdminHomeContent() {
  const { data: users } = useSuspenseQuery(adminUsersQueryOptions());

  return (
    <main className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      <ContentHeader
        title="Admin"
        subtitle="Overview and shortcuts. Use the sidebar to move between sections."
        className="mb-0"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{users.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Registered accounts</p>
            <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
              <Link href="/admin/users">Open users</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">All sections</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map(({ href, title, description, icon: Icon }) => (
            <Card key={href}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" size="sm" asChild>
                  <Link href={href}>Go</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function AdminHomePage() {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    }>
      <AdminHomeContent />
    </Suspense>
  );
}
