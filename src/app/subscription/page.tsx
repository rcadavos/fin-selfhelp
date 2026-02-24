"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { getSubscriptionStatus, unsubscribe, type SubscriptionStatus } from "@/actions/budget";
import { CreditCard, Loader2 } from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsubmitting, setUnsubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getSubscriptionStatus().then((data) => {
      if (!cancelled) setStatus(data ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  async function handleUnsubscribe() {
    const endsAt = status?.subscriptionEndsAt ? formatDate(status.subscriptionEndsAt) : "your period end";
    if (!confirm(`Unsubscribe? You'll keep full Pro access until ${endsAt}. You won't be charged again.`)) return;
    setUnsubmitting(true);
    setError(null);
    const result = await unsubscribe();
    if (result.error) {
      setError(result.error);
      setUnsubmitting(false);
      return;
    }
    const next = await getSubscriptionStatus();
    setStatus(next ?? null);
    setUnsubmitting(false);
  }

  if (userLoading || !user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const hasPro = status?.hasProAccess ?? false;
  const isRecurring = status?.isRecurring ?? false;
  const endsAt = status?.subscriptionEndsAt ?? null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Subscription</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your plan and payment.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current plan</CardTitle>
            <CardDescription>
              {hasPro
                ? isRecurring
                  ? "You're on Pro with automatic renewal. You get reminders and unlimited expenses."
                  : "You've unsubscribed. You still have full Pro access until the date below."
                : "You're on the free plan. Upgrade for reminders and more than 5 expenses."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
              <span className="font-medium">{hasPro ? "Pro" : "Free"}</span>
              <span className="text-sm text-muted-foreground">
                {hasPro
                  ? endsAt
                    ? `Until ${formatDate(endsAt)}`
                    : isRecurring
                      ? "$3/month"
                      : "Limited"
                  : "Limited"}
              </span>
            </div>
            {hasPro && endsAt && isRecurring && (
              <p className="text-xs text-muted-foreground">
                Access until {formatDate(endsAt)}. Renews monthly unless you unsubscribe.
              </p>
            )}
            {hasPro && endsAt && !isRecurring && (
              <p className="text-xs text-muted-foreground">
                Full access until {formatDate(endsAt)}. You won't be charged again.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {hasPro ? (
              <>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/payment" className="flex items-center justify-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Change payment method
                  </Link>
                </Button>
                {isRecurring && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleUnsubscribe}
                    disabled={unsubmitting}
                  >
                    {unsubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Unsubscribing…
                      </>
                    ) : (
                      "Unsubscribe (keep access until expiry)"
                    )}
                  </Button>
                )}
              </>
            ) : (
              <Button className="w-full" asChild>
                <Link href="/payment" className="flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Upgrade to Pro — 1 month
                </Link>
              </Button>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardFooter>
        </Card>

        <div className="flex justify-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Back to My budget</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
