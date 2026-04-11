"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPaymentReceiptById, type SubscriptionPaymentRow } from "@/actions/receipts";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { Loader2, Download, ArrowLeft } from "lucide-react";

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" });
}

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [payment, setPayment] = useState<SubscriptionPaymentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = typeof params.id === "string" ? params.id : null;

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    getPaymentReceiptById(id).then((result) => {
      if (!cancelled) {
        setPayment(result.payment ?? null);
        setError(result.error ?? null);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, user]);

  function handlePrint() {
    window.print();
  }

  if (userLoading || !user) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="app-main-centered">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error || !payment) {
    return (
      <main className="w-full min-w-0 flex-1 bg-background px-4 py-12">
        <div className="mx-auto max-w-md text-center space-y-4">
          <p className="text-destructive">{error ?? "Receipt not found."}</p>
          <Button asChild variant="outline">
            <Link href="/subscription">Back to Subscription</Link>
          </Button>
        </div>
      </main>
    );
  }

  const amount = payment.amountCents / 100;

  return (
    <main className="w-full min-w-0 flex-1 bg-background px-4 py-8 print:min-h-0 print:py-4">
      <div className="mx-auto max-w-lg">
        {/* Screen-only actions */}
        <div className="flex flex-wrap items-center gap-2 mb-6 print:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link href="/subscription" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button size="sm" onClick={handlePrint} className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>

        {/* Receipt content – print-friendly */}
        <article className="border rounded-lg bg-white text-black p-6 shadow-sm print:shadow-none print:border print:p-6">
          <h1 className="text-xl font-semibold mb-1">OmniTrak</h1>
          <p className="text-sm text-neutral-500 mb-6">Payment receipt</p>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Date</dt>
              <dd>{formatDate(payment.paidAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Description</dt>
              <dd>{payment.description || "Pro subscription"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Amount</dt>
              <dd className="font-semibold">{formatCurrency(amount, payment.currency)}</dd>
            </div>
            {payment.paymentIntentId && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">Reference</dt>
                <dd className="font-mono text-xs truncate max-w-[180px]" title={payment.paymentIntentId}>
                  {payment.paymentIntentId}
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-6 pt-4 border-t text-xs text-neutral-400">
            Thank you for your payment. This receipt is for your records.
          </p>
        </article>

        <p className="mt-4 text-center text-sm text-muted-foreground print:hidden">
          Use &quot;Print / Save as PDF&quot; to download this receipt.
        </p>
      </div>
    </main>
  );
}
