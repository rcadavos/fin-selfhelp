"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { getMyPaymentHistory, type SubscriptionPaymentRow } from "@/actions/receipts";
import { formatCurrency } from "@/lib/utils";
import { subscriptionPlanQueryOptions } from "@/lib/query/subscription-plan";
import { CreditCard, Loader2, FileText } from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { data: plan } = useQuery(subscriptionPlanQueryOptions());
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [payments, setPayments] = useState<SubscriptionPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsubmitting, setUnsubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getSubscriptionStatus(), getMyPaymentHistory()]).then(([data, history]) => {
      if (!cancelled) {
        setStatus(data ?? null);
        setPayments(history.payments ?? []);
      }
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
                    : isRecurring && plan
                      ? `${formatCurrency(plan.priceAmount, plan.priceCurrency)}/${plan.interval}`
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
                  Upgrade to {plan?.name ?? "Pro"} — 1 {plan?.interval ?? "month"}
                </Link>
              </Button>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardFooter>
        </Card>

        {payments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment history</CardTitle>
              <CardDescription>
                Download a receipt for any payment below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{formatDate(p.paidAt)}</span>
                    <span className="font-medium">{formatCurrency(p.amountCents / 100, p.currency)}</span>
                    <Button variant="ghost" size="sm" asChild className="shrink-0">
                      <Link href={`/subscription/receipt/${p.id}`} className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Receipt
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <Button variant="ghost" asChild>
            <Link href="/my-cashflow">Back to My Cashflow</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
