"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentHeader } from "@/components/app/content-header";
import { useUser } from "@/hooks/use-user";
import { unsubscribe } from "@/actions/budget";
import { formatCurrency, cn } from "@/lib/utils";
import { subscriptionPlansQueryOptions } from "@/lib/query/subscription-plan";
import {
  subscriptionPaymentsQueryOptions,
  subscriptionStatusQueryOptions,
  invalidateSubscriptionAndExpenseQueries,
} from "@/lib/query/subscription-user";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

const PRO_FEATURES = [
  "Unlimited expense entries",
  "Payment reminders",
  "Full access to calculators & tools",
] as const;

function SubscriptionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: userLoading } = useUser();
  const justPaid = searchParams.get("paid") === "1";
  const { data: plans } = useQuery(subscriptionPlansQueryOptions());
  const statusQuery = useQuery({
    ...subscriptionStatusQueryOptions(),
    enabled: !!user && !userLoading,
  });
  const paymentsQuery = useQuery({
    ...subscriptionPaymentsQueryOptions(),
    enabled: !!user && !userLoading,
  });
  const [unsubmitting, setUnsubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  useEffect(() => {
    if (justPaid) {
      void invalidateSubscriptionAndExpenseQueries(queryClient);
    }
  }, [justPaid, queryClient]);

  async function handleUnsubscribe() {
    const status = statusQuery.data ?? null;
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
    await invalidateSubscriptionAndExpenseQueries(queryClient);
    setUnsubmitting(false);
  }

  if (userLoading || !user) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const loading = statusQuery.isPending || paymentsQuery.isPending;
  if (loading) {
    return (
      <main className="app-main-centered">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const fetchError =
    statusQuery.isError || paymentsQuery.isError
      ? (() => {
          const e = statusQuery.error ?? paymentsQuery.error;
          return e instanceof Error ? e.message : "Could not load subscription.";
        })()
      : null;

  const status = statusQuery.data ?? null;
  const payments = paymentsQuery.data ?? [];

  const hasPro = status?.hasProAccess ?? false;
  const hasPremium = status?.hasPremiumAccess ?? false;
  const isRecurring = status?.isRecurring ?? false;
  const endsAt = status?.subscriptionEndsAt ?? null;
  const tierLabel = hasPremium ? "Premium" : hasPro ? "Pro" : "Free";
  const activePlan = hasPremium ? plans?.premium : plans?.pro;
  const planPrice =
    activePlan && isRecurring && hasPro
      ? `${formatCurrency(activePlan.priceAmount, activePlan.priceCurrency)}/${activePlan.interval}`
      : null;

  return (
    <main className="w-full min-w-0 space-y-8 py-2">
      {justPaid && (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          Payment received — your subscription is now active. Thank you!
        </p>
      )}
      {fetchError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </p>
      )}
      <ContentHeader
        title="Subscription"
        subtitle="Your plan, billing, and payment history in one place."
        icon={Sparkles}
      />

      {/* Status hero */}
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8",
          hasPro
            ? "border-primary/20 bg-gradient-to-br from-primary/15 via-primary/8 to-background dark:from-primary/20 dark:via-primary/10"
            : "border-border/80 bg-muted/30"
        )}
        aria-labelledby="subscription-status-heading"
      >
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {hasPro ? (
                isRecurring ? (
                  <Badge variant="success" className="font-medium">
                    {hasPremium ? "Premium" : "Pro"} · active
                  </Badge>
                ) : (
                  <Badge variant="warning" className="font-medium">
                    {tierLabel} · ends {endsAt ? formatDate(endsAt) : "soon"}
                  </Badge>
                )
              ) : (
                <Badge variant="secondary" className="font-medium">
                  Free plan
                </Badge>
              )}
            </div>
            <h2 id="subscription-status-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
              {hasPro ? (hasPremium ? "OmniTrak Premium" : "OmniTrak Pro") : "Upgrade your plan"}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {hasPro
                ? isRecurring
                  ? "You have full access to reminders, unlimited expenses, and premium features. Manage payment or cancel renewal below—your access stays until the end of the billing period."
                  : "Your subscription is cancelled. You still have full Pro access until the date below; you won’t be charged again."
                : "Unlock reminders, unlimited expenses, and the full toolkit. Choose a plan on the payment page when you’re ready."}
            </p>
          </div>

          <div
            className={cn(
              "flex min-w-[200px] flex-col gap-3 rounded-xl border p-4 sm:min-w-[240px]",
              hasPro ? "border-primary/25 bg-background/80 backdrop-blur-sm dark:bg-background/40" : "bg-background/60"
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
            {hasPro ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Access</span>
                  <span className="text-right text-sm font-semibold">{tierLabel}</span>
                </div>
                {endsAt && (
                  <div className="flex items-start justify-between gap-2 border-t border-border/60 pt-3">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      {isRecurring ? "Renews / ends" : "Access until"}
                    </span>
                    <span className="text-right text-sm font-medium tabular-nums">{formatDate(endsAt)}</span>
                  </div>
                )}
                {planPrice && isRecurring && (
                  <p className="text-xs text-muted-foreground">{planPrice} when renewing</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Current</span>
                  <span className="text-right text-sm font-semibold">Free</span>
                </div>
                {plans?.pro && (
                  <p className="border-t border-border/60 pt-3 text-sm text-muted-foreground">
                    Pro from{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(plans.pro.priceAmount, plans.pro.priceCurrency)}/{plans.pro.interval}
                    </span>
                    {plans.premium && (
                      <>
                        {" "}
                        · Premium from{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(plans.premium.priceAmount, plans.premium.priceCurrency)}/
                          {plans.premium.interval}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-3" aria-labelledby="subscription-actions-heading">
        <h3 id="subscription-actions-heading" className="text-sm font-medium text-muted-foreground">
          Billing & plan
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {hasPro ? (
            <>
              <Button variant="default" className="w-full sm:w-auto sm:min-w-[200px]" asChild>
                <Link href="/account/subscription/payment" className="gap-2">
                  <CreditCard className="h-4 w-4" aria-hidden />
                  Change payment method
                </Link>
              </Button>
              {isRecurring && (
                <Button
                  variant="outline"
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                  onClick={handleUnsubscribe}
                  disabled={unsubmitting}
                >
                  {unsubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Unsubscribing…
                    </>
                  ) : (
                    "Cancel renewal"
                  )}
                </Button>
              )}
            </>
          ) : (
            <Button className="w-full gap-2 sm:w-auto" size="lg" asChild>
              <Link href="/account/subscription/payment">
                View plans & upgrade
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {/* Free tier: what you get with Pro */}
      {!hasPro && (
        <section className="rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] p-5 sm:p-6">
          <p className="text-sm font-medium text-foreground">Included with Pro</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-1 md:grid-cols-3">
            {PRO_FEATURES.map((line) => (
              <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <section className="space-y-4" aria-labelledby="payment-history-heading">
          <div className="flex items-center justify-between gap-2">
            <h3 id="payment-history-heading" className="text-lg font-semibold tracking-tight">
              Payment history
            </h3>
            <span className="text-xs text-muted-foreground">{payments.length} payment{payments.length === 1 ? "" : "s"}</span>
          </div>
          <p className="text-sm text-muted-foreground">Open a receipt for your records or taxes.</p>
          <ul className="divide-y divide-border rounded-xl border bg-card">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium tabular-nums">{formatCurrency(p.amountCents / 100, p.currency)}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(p.paidAt)}</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
                  <Link href={`/account/subscription/receipt/${p.id}`} className="gap-2">
                    <FileText className="h-4 w-4" aria-hidden />
                    View receipt
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pt-2">
        <Button variant="ghost" asChild className="h-auto px-0 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionPageInner />
    </Suspense>
  );
}
