"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ContentHeader } from "@/components/app/content-header";
import { useUser } from "@/hooks/use-user";
import { unsubscribe } from "@/actions/budget";
import {
  createPayMongoQRPhPaymentIntent,
  createPayMongoCheckoutSession,
  checkPayMongoPaymentStatus,
} from "@/actions/paymongo";
import { formatCurrency, cn } from "@/lib/utils";
import { subscriptionPlansQueryOptions } from "@/lib/query/subscription-plan";
import {
  subscriptionPaymentsQueryOptions,
  subscriptionStatusQueryOptions,
  invalidateSubscriptionAndExpenseQueries,
} from "@/lib/query/subscription-user";
import {
  CalendarClock,
  Check,
  CreditCard,
  FileText,
  Gem,
  Loader2,
  QrCode,
  Sparkles,
  Wallet,
} from "lucide-react";
import { freeBenefits, premiumExtra, proBenefits } from "@/components/landing/subscribe-section";

/* ─── helpers ─────────────────────────────────────────────── */

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatPrice(amount: number, currency: string, interval: string) {
  return `${formatCurrency(amount, currency)}/${interval}`;
}

/* ─── QR PH card (reused from payment page) ─────────────── */

type PlanInfo = { name: string; priceAmount: number; priceCurrency: string; interval: string } | undefined;

function QRPhPanel({
  plan,
  planLabel,
  paymongoQr,
  paymongoLoading,
  paymongoError,
  onGenerate,
  confirming,
  confirmError,
  onConfirm,
}: {
  plan: PlanInfo;
  planLabel: string;
  paymongoQr: { paymentIntentId: string; qrImageDataUrl: string } | null;
  paymongoLoading: boolean;
  paymongoError: string | null;
  onGenerate: () => Promise<void>;
  confirming: boolean;
  confirmError: string | null;
  onConfirm: () => Promise<void>;
}) {
  const notConfigured = paymongoError?.includes("not configured");
  return (
    <div className="flex flex-col items-center gap-4">
      {!paymongoQr?.qrImageDataUrl ? (
        <div className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 p-6">
          {notConfigured ? (
            <p className="text-center text-sm text-muted-foreground">
              QR PH is not configured on this server.
            </p>
          ) : (
            <>
              <p className="text-center text-sm text-muted-foreground">
                Generate a one-time QR code. Valid for 30 minutes.
              </p>
              <Button onClick={onGenerate} disabled={paymongoLoading}>
                {paymongoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate QR code"}
              </Button>
              {paymongoError && <p className="text-sm text-destructive">{paymongoError}</p>}
            </>
          )}
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border bg-white p-4">
          <Image src={paymongoQr.qrImageDataUrl} alt="Scan to pay via QR PH" width={220} height={220} className="object-contain" unoptimized />
        </div>
      )}
      <div className="space-y-1 text-center">
        <p className="font-semibold">
          Amount: {plan ? formatPrice(plan.priceAmount, plan.priceCurrency, plan.interval) : "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {paymongoQr ? "Scan and pay, then click confirm." : "Scan QR in GCash / Maya / any QR PH app"}
        </p>
      </div>
      <Button className="h-10 w-full" disabled={confirming || !paymongoQr} onClick={onConfirm}>
        {confirming ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking payment…</>
        ) : (
          `I've paid — activate ${planLabel}`
        )}
      </Button>
      {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
    </div>
  );
}

/* ─── inline payment form ────────────────────────────────── */

function PaymentForm({
  checkoutPlan,
  queryClient,
  router,
}: {
  checkoutPlan: "pro" | "premium";
  queryClient: ReturnType<typeof useQueryClient>;
  router: ReturnType<typeof useRouter>;
}) {
  const { data: plans } = useSuspenseQuery(subscriptionPlansQueryOptions());
  const [method, setMethod] = useState<"card" | "ewallet" | "qrph">("card");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymongoQr, setPaymongoQr] = useState<{ paymentIntentId: string; qrImageDataUrl: string } | null>(null);
  const [paymongoLoading, setPaymongoLoading] = useState(false);
  const [paymongoError, setPaymongoError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const selectedPlan = checkoutPlan === "premium" ? plans?.premium : plans?.pro;

  async function handleCheckout(methods: string[]) {
    setCheckoutLoading(true);
    setCheckoutError(null);
    const result = await createPayMongoCheckoutSession(checkoutPlan, methods);
    if (result.error) { setCheckoutError(result.error); setCheckoutLoading(false); return; }
    if (result.checkoutUrl) window.location.href = result.checkoutUrl;
  }

  const methodTabs = [
    { id: "card" as const, label: "Card", icon: CreditCard },
    { id: "ewallet" as const, label: "GCash / Maya", icon: Wallet },
    { id: "qrph" as const, label: "QR PH", icon: QrCode },
  ];

  return (
    <div className="space-y-4">
      {selectedPlan && (
        <div className="flex items-baseline justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {checkoutPlan === "premium" ? "Premium" : "Pro"} subscription
          </span>
          <span className="font-semibold">
            {formatPrice(selectedPlan.priceAmount, selectedPlan.priceCurrency, selectedPlan.interval)}
          </span>
        </div>
      )}

      {/* Method tabs */}
      <div className="flex rounded-lg border bg-muted/30 p-1">
        {methodTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setMethod(id); setCheckoutError(null); setPaymongoError(null); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors",
              method === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {method === "card" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Pay with Visa, Mastercard, or JCB via PayMongo's secure checkout.</p>
          {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}
          <Button className="h-11 w-full" disabled={checkoutLoading || !selectedPlan} onClick={() => handleCheckout(["card"])}>
            {checkoutLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting…</> : `Pay with Card — ${selectedPlan ? formatPrice(selectedPlan.priceAmount, selectedPlan.priceCurrency, selectedPlan.interval) : ""}`}
          </Button>
        </div>
      )}

      {method === "ewallet" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Pay with GCash, Maya, or GrabPay via PayMongo's secure checkout.</p>
          {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}
          <Button className="h-11 w-full" disabled={checkoutLoading || !selectedPlan} onClick={() => handleCheckout(["gcash", "paymaya", "grab_pay"])}>
            {checkoutLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting…</> : `Continue to PayMongo — ${selectedPlan ? formatPrice(selectedPlan.priceAmount, selectedPlan.priceCurrency, selectedPlan.interval) : ""}`}
          </Button>
        </div>
      )}

      {method === "qrph" && (
        <QRPhPanel
          plan={selectedPlan}
          planLabel={checkoutPlan === "premium" ? "Premium" : "Pro"}
          paymongoQr={paymongoQr}
          paymongoLoading={paymongoLoading}
          paymongoError={paymongoError}
          onGenerate={async () => {
            setPaymongoLoading(true);
            setPaymongoError(null);
            const result = await createPayMongoQRPhPaymentIntent(checkoutPlan);
            setPaymongoLoading(false);
            if (result.error) { setPaymongoError(result.error); return; }
            if (result.paymentIntentId && result.qrImageDataUrl)
              setPaymongoQr({ paymentIntentId: result.paymentIntentId, qrImageDataUrl: result.qrImageDataUrl });
          }}
          confirming={confirming}
          confirmError={confirmError}
          onConfirm={async () => {
            if (!paymongoQr) return;
            setConfirming(true);
            setConfirmError(null);
            for (let i = 0; i < 30; i++) {
              const result = await checkPayMongoPaymentStatus(paymongoQr.paymentIntentId);
              if (result.status === "succeeded") {
                setConfirming(false);
                await invalidateSubscriptionAndExpenseQueries(queryClient);
                router.push("/account/subscription?paid=1");
                return;
              }
              if (result.status === "failed" && result.error) {
                setConfirmError(result.error);
                setConfirming(false);
                return;
              }
              await new Promise((r) => setTimeout(r, 2000));
            }
            setConfirmError("Payment not detected yet. If you already paid, we'll confirm it shortly.");
            setConfirming(false);
          }}
        />
      )}
    </div>
  );
}

/* ─── main inner component ───────────────────────────────── */

function SubscriptionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: userLoading } = useUser();
  const justPaid = searchParams.get("paid") === "1";
  const planParam = searchParams.get("plan");

  const { data: plans } = useSuspenseQuery(subscriptionPlansQueryOptions());
  const statusQuery = useSuspenseQuery(subscriptionStatusQueryOptions());
  const paymentsQuery = useSuspenseQuery(subscriptionPaymentsQueryOptions());

  const [unsubmitting, setUnsubmitting] = useState(false);
  const [unsubError, setUnsubError] = useState<string | null>(null);
  const premiumEnabled = plans?.premium?.enabled ?? true;
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium" | null>(
    planParam === "premium" && premiumEnabled ? "premium" : planParam === "pro" ? "pro" : null
  );
  const paymentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!userLoading && !user) router.replace("/login"); }, [user, userLoading, router]);
  useEffect(() => { if (justPaid) void invalidateSubscriptionAndExpenseQueries(queryClient); }, [justPaid, queryClient]);

  function selectPlan(plan: "pro" | "premium") {
    setSelectedPlan(plan);
    setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function handleUnsubscribe() {
    const status = statusQuery.data ?? null;
    const endsAt = status?.subscriptionEndsAt ? formatDate(status.subscriptionEndsAt) : "your period end";
    if (!confirm(`Unsubscribe? You'll keep full Pro access until ${endsAt}. You won't be charged again.`)) return;
    setUnsubmitting(true);
    setUnsubError(null);
    const result = await unsubscribe();
    if (result.error) { setUnsubError(result.error); setUnsubmitting(false); return; }
    await invalidateSubscriptionAndExpenseQueries(queryClient);
    setUnsubmitting(false);
  }

  if (userLoading || !user) {
    return <main className="app-main-centered"><p className="text-muted-foreground">Loading…</p></main>;
  }

  const loading = statusQuery.isPending || paymentsQuery.isPending;
  if (loading) {
    return <main className="app-main-centered"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></main>;
  }

  const fetchError = (statusQuery.isError || paymentsQuery.isError)
    ? (() => { const e = statusQuery.error ?? paymentsQuery.error; return e instanceof Error ? e.message : "Could not load subscription."; })()
    : null;

  const status = statusQuery.data ?? null;
  const payments = paymentsQuery.data ?? [];
  const hasPro = status?.hasProAccess ?? false;
  const hasPremium = status?.hasPremiumAccess ?? false;
  const isRecurring = status?.isRecurring ?? false;
  const endsAt = status?.subscriptionEndsAt ?? null;
  const tierLabel = hasPremium ? "Premium" : hasPro ? "Pro" : "Free";
  const activePlan = hasPremium ? plans?.premium : plans?.pro;
  const planPrice = activePlan && isRecurring && hasPro
    ? `${formatCurrency(activePlan.priceAmount, activePlan.priceCurrency)}/${activePlan.interval}`
    : null;

  return (
    <main className="w-full min-w-0 space-y-10 py-2">
      {/* ── banners ── */}
      {justPaid && (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          Payment received — your subscription is now active. Thank you!
        </p>
      )}
      {fetchError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{fetchError}</p>
      )}

      <ContentHeader title="Subscription" subtitle="Your plan, billing, and payment history." icon={Sparkles} />

      {/* ── current plan status (only when subscribed) ── */}
      {hasPro && (
        <section
          className={cn(
            "relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8",
            "border-primary/20 bg-gradient-to-br from-primary/15 via-primary/8 to-background dark:from-primary/20 dark:via-primary/10"
          )}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {isRecurring ? (
                  <Badge variant="success" className="font-medium">{hasPremium ? "Premium" : "Pro"} • active</Badge>
                ) : (
                  <Badge variant="warning" className="font-medium">{tierLabel} • ends {endsAt ? formatDate(endsAt) : "soon"}</Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {hasPremium ? "OmniTrak Premium" : "OmniTrak Pro"}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {isRecurring
                  ? "You have full access. Manage or cancel renewal below — your access stays until the end of the billing period."
                  : "Your subscription is cancelled. Full access remains until the date below; you won't be charged again."}
              </p>
            </div>

            <div className="flex min-w-[200px] flex-col gap-3 rounded-xl border border-primary/25 bg-background/80 p-4 backdrop-blur-sm dark:bg-background/40">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-muted-foreground">Access</span>
                <span className="text-sm font-semibold">{tierLabel}</span>
              </div>
              {endsAt && (
                <div className="flex items-start justify-between gap-2 border-t border-border/60 pt-3">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarClock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    {isRecurring ? "Renews" : "Access until"}
                  </span>
                  <span className="text-right text-sm font-medium tabular-nums">{formatDate(endsAt)}</span>
                </div>
              )}
              {planPrice && (
                <p className="text-xs text-muted-foreground">{planPrice} when renewing</p>
              )}
            </div>
          </div>

          {/* billing actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="default" size="sm" asChild>
              <Link href="/account/subscription/payment" className="gap-2">
                <CreditCard className="h-4 w-4" aria-hidden />
                Change payment method
              </Link>
            </Button>
            {isRecurring && (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleUnsubscribe}
                disabled={unsubmitting}
              >
                {unsubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Unsubscribing…</> : "Cancel renewal"}
              </Button>
            )}
          </div>
          {unsubError && <p className="mt-3 text-sm text-destructive">{unsubError}</p>}
        </section>
      )}

      {/* ── plans ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {hasPro ? "Your plan & available upgrades" : "Choose a plan"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Start free, upgrade to Pro for reminders and unlimited lists, or Premium for extra modules.
        </p>

        <div className={cn("grid items-center gap-5", plans?.premium?.enabled ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          {/* Free */}
          <Card className="flex flex-col border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Free</CardTitle>
              <CardDescription>Track planned expenses and cashflow, no card required.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-2 text-sm text-muted-foreground">
              {freeBenefits.map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                  <span>{f}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="mt-auto">
              {!hasPro ? (
                <Badge variant="secondary" className="w-full justify-center py-1.5">Current plan</Badge>
              ) : (
                <p className="text-xs text-muted-foreground">Your base plan</p>
              )}
            </CardFooter>
          </Card>

          {/* Pro */}
          <Card className={cn(
            "relative flex flex-col overflow-hidden border-primary/60 shadow-xl ring-2 ring-primary/20 sm:scale-[1.06] sm:z-10",
            hasPro && !hasPremium ? "bg-primary/5" : "bg-primary/[0.03]"
          )}>
            <div className="absolute left-0 top-0">
              <span className="inline-flex items-center gap-1 rounded-br-xl bg-orange-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                🔥 Most Popular
              </span>
            </div>
            {(!hasPro || hasPremium) && (
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-primary/10" aria-hidden />
            )}
            <CardHeader className="pt-7">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <CardTitle className="text-base">{plans?.pro?.name ?? "Pro"}</CardTitle>
                {hasPro && !hasPremium && <Badge variant="success" className="ml-auto text-xs">Current</Badge>}
              </div>
              {plans?.pro && (
                <div className="mt-1 flex items-baseline gap-1">
                  {plans.pro.originalPriceAmount != null && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(plans.pro.originalPriceAmount, plans.pro.priceCurrency)}
                    </span>
                  )}
                  <span className="text-xl font-bold">{formatCurrency(plans.pro.priceAmount, plans.pro.priceCurrency)}</span>
                  <span className="text-sm text-muted-foreground">/{plans.pro.interval}</span>
                </div>
              )}
              <CardDescription>Full access on My Expenses, To Buy and To Do.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-2 text-sm">
              {proBenefits.map((f) => (
                <div key={f} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{f}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="mt-auto">
              {hasPro && !hasPremium ? (
                <p className="text-xs text-muted-foreground">You're on this plan</p>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => selectPlan("pro")}
                  variant={selectedPlan === "pro" ? "secondary" : "default"}
                >
                  {selectedPlan === "pro" ? "Selected ↓" : plans?.pro
                    ? `Get Pro — ${formatCurrency(plans.pro.priceAmount, plans.pro.priceCurrency)}/${plans.pro.interval}`
                    : "Get Pro"}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Premium */}
          {plans?.premium?.enabled && (
          <Card className={cn(
            "relative flex flex-col overflow-hidden border-sky-500/40",
            hasPremium ? "bg-sky-500/[0.08] dark:bg-sky-950/20" : "bg-sky-500/[0.04] dark:bg-sky-950/10"
          )}>
            {!hasPremium && (
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-sky-500/10" aria-hidden />
            )}
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gem className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
                <CardTitle className="text-base">{plans?.premium?.name ?? "Premium"}</CardTitle>
                {hasPremium && <Badge variant="success" className="ml-auto text-xs">Current</Badge>}
              </div>
              {plans?.premium && (
                <div className="mt-1 flex items-baseline gap-1">
                  {plans.premium.originalPriceAmount != null && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(plans.premium.originalPriceAmount, plans.premium.priceCurrency)}
                    </span>
                  )}
                  <span className="text-xl font-bold">{formatCurrency(plans.premium.priceAmount, plans.premium.priceCurrency)}</span>
                  <span className="text-sm text-muted-foreground">/{plans.premium.interval}</span>
                </div>
              )}
              <CardDescription>Pro plus premium-only trackers.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-2 text-sm">
              {premiumExtra.map((f) => (
                <div key={f} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
                  <span>{f}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="mt-auto">
              {hasPremium ? (
                <p className="text-xs text-muted-foreground">You're on this plan</p>
              ) : (
                <Button
                  className="w-full bg-sky-600 text-white hover:bg-sky-600/90 dark:bg-sky-500"
                  onClick={() => selectPlan("premium")}
                  variant={selectedPlan === "premium" ? "secondary" : "default"}
                >
                  {selectedPlan === "premium" ? "Selected ↓" : plans?.premium
                    ? `Get Premium — ${formatCurrency(plans.premium.priceAmount, plans.premium.priceCurrency)}/${plans.premium.interval}`
                    : "Get Premium"}
                </Button>
              )}
            </CardFooter>
          </Card>
          )}
        </div>
      </section>

      {/* ── inline payment form ── */}
      {selectedPlan && (
        <section ref={paymentRef} className="scroll-mt-6 rounded-2xl border border-border/80 bg-muted/20 p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold">
                Complete payment — {selectedPlan === "premium" ? "Premium" : "Pro"}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Choose your preferred payment method.</p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={() => setSelectedPlan(null)}>
              Cancel
            </Button>
          </div>
          <PaymentForm checkoutPlan={selectedPlan} queryClient={queryClient} router={router} />
        </section>
      )}

      {/* ── payment history ── */}
      {payments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight">Payment history</h3>
            <span className="text-xs text-muted-foreground">{payments.length} payment{payments.length === 1 ? "" : "s"}</span>
          </div>
          <p className="text-sm text-muted-foreground">Open a receipt for your records or taxes.</p>
          <ul className="divide-y divide-border rounded-xl border bg-card">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
    <Suspense fallback={
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    }>
      <SubscriptionPageInner />
    </Suspense>
  );
}
