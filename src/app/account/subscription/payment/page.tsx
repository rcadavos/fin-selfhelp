"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { createPayMongoQRPhPaymentIntent, checkPayMongoPaymentStatus } from "@/actions/paymongo";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";
import { subscriptionPlansQueryOptions } from "@/lib/query/subscription-plan";
import { invalidateSubscriptionAndExpenseQueries } from "@/lib/query/subscription-user";
import { CreditCard, Smartphone, Loader2 } from "lucide-react";

function formatPrice(amount: number, currency: string, interval: string): string {
  return `${formatCurrency(amount, currency)}/${interval}`;
}

type Plan = { name: string; priceAmount: number; priceCurrency: string; interval: string } | undefined;

function QRPhCard({
  plan,
  planLabel,
  formatPrice: fmt,
  paymongoQr,
  paymongoLoading,
  paymongoError,
  onGeneratePayMongo,
  confirming,
  confirmError,
  onConfirm,
}: {
  plan: Plan;
  planLabel: string;
  formatPrice: (a: number, c: string, i: string) => string;
  paymongoQr: { paymentIntentId: string; qrImageDataUrl: string } | null;
  paymongoLoading: boolean;
  paymongoError: string | null;
  onGeneratePayMongo: () => Promise<void>;
  confirming: boolean;
  confirmError: string | null;
  onConfirm: () => Promise<void>;
}) {
  const paymongoQrImageUrl = paymongoQr?.qrImageDataUrl;
  const notConfigured = paymongoError?.includes("not configured");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pay with QR PH (PayMongo)</CardTitle>
        <CardDescription>
          Scan with GCash, Maya, or any bank app that supports QR PH to pay.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {!paymongoQrImageUrl && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 p-6">
            {notConfigured ? (
              <p className="text-center text-sm text-muted-foreground">
                PayMongo is not configured. Set{" "}
                <code className="rounded bg-muted px-1 text-xs">PAYMONGO_SECRET_KEY</code> in .env.local to enable QR PH
                payments.
              </p>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Generate a one-time QR code for the exact amount. Valid for 30 minutes.
                </p>
                <Button onClick={onGeneratePayMongo} disabled={paymongoLoading}>
                  {paymongoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate QR code"}
                </Button>
                {paymongoError && <p className="text-sm text-destructive">{paymongoError}</p>}
              </>
            )}
          </div>
        )}
        {paymongoQrImageUrl && (
          <div className="flex min-h-[240px] items-center justify-center rounded-lg border bg-white p-4">
            <img
              src={paymongoQrImageUrl}
              alt="Scan to pay via QR PH"
              width={240}
              height={240}
              className="object-contain"
            />
          </div>
        )}
        <div className="space-y-1 text-center">
          <p className="font-semibold text-foreground">
            Amount: {plan ? fmt(plan.priceAmount, plan.priceCurrency, plan.interval) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {paymongoQrImageUrl
              ? "QR code expires in 30 minutes. Scan and pay, then click below."
              : "Open your e-wallet or bank app → Scan QR → Confirm payment"}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button className="w-full" disabled={confirming || !paymongoQrImageUrl} onClick={onConfirm}>
          {confirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking payment…
            </>
          ) : (
            `I've completed payment — activate 1 month ${planLabel}`
          )}
        </Button>
        {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
        <Button variant="outline" className="w-full" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function SubscriptionPaymentInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const { data: plans } = useQuery(subscriptionPlansQueryOptions());
  const [checkoutPlan, setCheckoutPlan] = useState<"pro" | "premium">("pro");
  const [method, setMethod] = useState<"card" | "qrph">("card");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [paymongoQr, setPaymongoQr] = useState<{ paymentIntentId: string; qrImageDataUrl: string } | null>(null);
  const [paymongoLoading, setPaymongoLoading] = useState(false);
  const [paymongoError, setPaymongoError] = useState<string | null>(null);

  useEffect(() => {
    const p = searchParams.get("plan") === "premium" ? "premium" : "pro";
    setCheckoutPlan(p);
  }, [searchParams]);

  useEffect(() => {
    setPaymongoQr(null);
    setPaymongoError(null);
  }, [checkoutPlan]);

  const selectedPlan = checkoutPlan === "premium" ? plans?.premium : plans?.pro;

  if (loading) {
    return (
      <main className="app-main-centered min-h-[40vh]">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-main-centered min-h-[40vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in to subscribe</CardTitle>
            <CardDescription>Create an account or log in, then return here to complete payment.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href={`/login?next=${encodeURIComponent("/account/subscription/payment")}`}>Log in</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/signup">Create account</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="/#subscribe">Back to home</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="w-full min-w-0 py-2">
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Complete payment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose Pro or Premium, then pay. Pro unlocks due dates, reminders, and unlimited lists. Premium adds extra
            modules (rent & payment trackers).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={checkoutPlan === "pro" ? "default" : "outline"}
            className="h-auto flex-col gap-1 py-3"
            onClick={() => setCheckoutPlan("pro")}
          >
            <span className="font-semibold">Pro</span>
            {plans?.pro && (
              <span className="text-xs font-normal opacity-90">
                {formatPrice(plans.pro.priceAmount, plans.pro.priceCurrency, plans.pro.interval)}
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant={checkoutPlan === "premium" ? "default" : "outline"}
            className="h-auto flex-col gap-1 py-3"
            onClick={() => setCheckoutPlan("premium")}
          >
            <span className="font-semibold">Premium</span>
            {plans?.premium && (
              <span className="text-xs font-normal opacity-90">
                {formatPrice(plans.premium.priceAmount, plans.premium.priceCurrency, plans.premium.interval)}
              </span>
            )}
          </Button>
        </div>

        {selectedPlan && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{selectedPlan.name} subscription</span>
                <span className="font-medium">
                  {formatPrice(selectedPlan.priceAmount, selectedPlan.priceCurrency, selectedPlan.interval)}
                </span>
              </div>
              {selectedPlan.originalPriceAmount != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground line-through">
                    Was{" "}
                    {formatPrice(selectedPlan.originalPriceAmount, selectedPlan.priceCurrency, selectedPlan.interval)}
                  </span>
                  <span className="font-medium text-primary">
                    Now {formatPrice(selectedPlan.priceAmount, selectedPlan.priceCurrency, selectedPlan.interval)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex rounded-lg border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setMethod("card")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
              method === "card" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CreditCard className="h-4 w-4" />
            Card
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("qrph");
              setPaymongoError(null);
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
              method === "qrph" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-4 w-4" />
            QR PH
          </button>
        </div>

        {method === "card" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pay with card</CardTitle>
              <CardDescription>
                Card payment will be powered by Stripe. Connect your Stripe account to accept payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-number">Card number</Label>
                <Input id="card-number" placeholder="4242 4242 4242 4242" disabled className="bg-muted/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input id="expiry" placeholder="MM / YY" disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" disabled className="bg-muted/50" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Add Stripe Elements or Checkout to enable card payments.</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled>
                Pay{" "}
                {selectedPlan
                  ? formatPrice(selectedPlan.priceAmount, selectedPlan.priceCurrency, selectedPlan.interval)
                  : "—"}{" "}
                — connect Stripe to enable
              </Button>
            </CardFooter>
          </Card>
        )}

        {method === "qrph" && (
          <QRPhCard
            plan={selectedPlan}
            planLabel={checkoutPlan === "premium" ? "Premium" : "Pro"}
            formatPrice={formatPrice}
            paymongoQr={paymongoQr}
            paymongoLoading={paymongoLoading}
            paymongoError={paymongoError}
            onGeneratePayMongo={async () => {
              setPaymongoLoading(true);
              setPaymongoError(null);
              const result = await createPayMongoQRPhPaymentIntent(checkoutPlan);
              setPaymongoLoading(false);
              if (result.error) {
                setPaymongoError(result.error);
                return;
              }
              if (result.paymentIntentId && result.qrImageDataUrl) {
                setPaymongoQr({ paymentIntentId: result.paymentIntentId, qrImageDataUrl: result.qrImageDataUrl });
              }
            }}
            confirming={confirming}
            confirmError={confirmError}
            onConfirm={async () => {
              if (!paymongoQr) return;
              setConfirming(true);
              setConfirmError(null);
              const maxAttempts = 30;
              for (let i = 0; i < maxAttempts; i++) {
                const result = await checkPayMongoPaymentStatus(paymongoQr.paymentIntentId);
                if (result.status === "succeeded") {
                  setConfirming(false);
                  await invalidateSubscriptionAndExpenseQueries(queryClient);
                  router.push("/account/subscription");
                  return;
                }
                if (result.status === "failed" && result.error) {
                  setConfirmError(result.error);
                  setConfirming(false);
                  return;
                }
                await new Promise((r) => setTimeout(r, 2000));
              }
              setConfirmError("Payment not detected yet. If you already paid, we’ll confirm it shortly.");
              setConfirming(false);
            }}
          />
        )}

        <div>
          <Button variant="ghost" asChild className="h-auto px-0 text-muted-foreground hover:text-foreground">
            <Link href="/#subscribe">Back to plans</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function SubscriptionPaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="app-main-centered min-h-[40vh]">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <SubscriptionPaymentInner />
    </Suspense>
  );
}
