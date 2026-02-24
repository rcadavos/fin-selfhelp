"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { recordSubscriptionPayment } from "@/actions/budget";
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
import { CreditCard, Smartphone } from "lucide-react";

const PLAN = { name: "Pro", price: 3, originalPrice: 20, interval: "month" };

const QR_IMAGE_URL = "/api/payment/qr-image";

export default function PaymentPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [method, setMethod] = useState<"card" | "qrph">("card");
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in to subscribe</CardTitle>
            <CardDescription>
              Create an account or log in, then return here to complete payment.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/login">Log in</Link>
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
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Complete payment</h1>
          <p className="mt-1 text-muted-foreground">
            Pro subscription — unlock reminders & unlimited expenses
          </p>
        </div>

        {/* Order summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{PLAN.name} subscription</span>
              <span className="font-medium">${PLAN.price}/{PLAN.interval}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground line-through">Was ${PLAN.originalPrice}/{PLAN.interval}</span>
              <span className="text-primary font-medium">Now ${PLAN.price}/{PLAN.interval}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment method tabs */}
        <div className="flex rounded-lg border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setMethod("card")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
              method === "card"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Card
          </button>
          <button
            type="button"
            onClick={() => setMethod("qrph")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
              method === "qrph"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            QR PH
          </button>
        </div>

        {/* Card form (placeholder for Stripe) */}
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
                <Input
                  id="card-number"
                  placeholder="4242 4242 4242 4242"
                  disabled
                  className="bg-muted/50"
                />
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
              <p className="text-xs text-muted-foreground">
                Add Stripe Elements or Checkout to enable card payments.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled
              >
                Pay ${PLAN.price} — connect Stripe to enable
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* QR PH (Philippines) – your UnionBank QR from src/qr-payment/ (served via API) */}
        {method === "qrph" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pay with QR PH (UnionBank)</CardTitle>
              <CardDescription>
                Scan with GCash, Maya, or any bank app that supports QR PH to pay.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="rounded-lg border bg-white p-4 min-h-[240px] flex items-center justify-center">
                {!qrImageFailed ? (
                  <img
                    src={QR_IMAGE_URL}
                    alt="Scan to pay via UnionBank QR PH"
                    width={240}
                    height={240}
                    className="object-contain"
                    onError={() => setQrImageFailed(true)}
                  />
                ) : (
                  <div className="text-center text-sm text-muted-foreground max-w-[220px] py-4">
                    <p className="font-medium text-foreground">Add your QR image</p>
                    <p className="mt-1">
                      Place your UnionBank QR file at:
                    </p>
                    <code className="mt-2 block text-xs bg-muted px-2 py-1 rounded break-all">
                      src/qr-payment/unionbank-qr.png
                    </code>
                    <p className="mt-2">(or .jpg)</p>
                  </div>
                )}
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Amount: ${PLAN.price} / {PLAN.interval}</p>
                <p className="text-xs text-muted-foreground">
                  Open your e-wallet or bank app → Scan QR above → Confirm payment
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={confirming}
                onClick={async () => {
                  setConfirming(true);
                  setConfirmError(null);
                  const result = await recordSubscriptionPayment();
                  if (result.error) {
                    setConfirmError(result.error);
                    setConfirming(false);
                    return;
                  }
                  router.push("/subscription");
                }}
              >
                {confirming ? "Activating…" : "I've completed payment — activate 1 month Pro"}
              </Button>
              {confirmError && (
                <p className="text-sm text-destructive">{confirmError}</p>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">Back to My budget</Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        <div className="flex justify-center">
          <Button variant="ghost" asChild>
            <Link href="/#subscribe">Back to plans</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
