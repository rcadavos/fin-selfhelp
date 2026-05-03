"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminPricingQueryOptions } from "@/lib/query/admin-pricing";
import { subscriptionPlansQueryOptions } from "@/lib/query/subscription-plan";
import { updateSubscriptionPlanById, type SubscriptionPlanRow } from "@/actions/subscription-plan";
import { ContentHeader } from "@/components/app/content-header";
import { Loader2 } from "lucide-react";

const CURRENCIES = ["USD", "PHP", "EUR", "GBP"];
const INTERVALS = ["month", "year"];

type PlanEditorProps = {
  planId: "pro" | "premium";
  title: string;
  description: string;
  plan: SubscriptionPlanRow;
};

function PlanEditor({ planId, title, description, plan }: PlanEditorProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [interval, setInterval] = useState("month");
  const [originalPriceAmount, setOriginalPriceAmount] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(plan.name);
    setPriceAmount(String(plan.priceAmount));
    setPriceCurrency(plan.priceCurrency);
    setInterval(plan.interval);
    setOriginalPriceAmount(plan.originalPriceAmount != null ? String(plan.originalPriceAmount) : "");
  }, [plan.id, plan.name, plan.priceAmount, plan.priceCurrency, plan.interval, plan.originalPriceAmount]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const result = await updateSubscriptionPlanById(planId, {
        name: name.trim(),
        priceAmount: Number(priceAmount) || 0,
        priceCurrency: priceCurrency.trim(),
        interval: interval.trim(),
        originalPriceAmount: originalPriceAmount === "" ? null : parseFloat(originalPriceAmount) || null,
      });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPricingQueryOptions().queryKey });
      queryClient.invalidateQueries({ queryKey: subscriptionPlansQueryOptions().queryKey });
      setActionError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const canSave =
    name.trim() !== plan.name ||
    Number(priceAmount) !== plan.priceAmount ||
    priceCurrency !== plan.priceCurrency ||
    interval !== plan.interval ||
    (originalPriceAmount === "" ? plan.originalPriceAmount != null : Number(originalPriceAmount) !== (plan.originalPriceAmount ?? -1));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        {saved && <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>}
        <div className="grid gap-2">
          <Label htmlFor={`${planId}-name`}>Plan name</Label>
          <Input id={`${planId}-name`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${planId}-price`}>Price amount</Label>
            <Input
              id={`${planId}-price`}
              type="number"
              min="0"
              step="0.01"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${planId}-currency`}>Currency</Label>
            <Select value={priceCurrency} onValueChange={setPriceCurrency}>
              <SelectTrigger id={`${planId}-currency`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${planId}-interval`}>Billing interval</Label>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger id={`${planId}-interval`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVALS.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${planId}-original`}>Original price (optional)</Label>
          <Input
            id={`${planId}-original`}
            type="number"
            min="0"
            step="0.01"
            placeholder="Leave empty for no strikethrough"
            value={originalPriceAmount}
            onChange={(e) => setOriginalPriceAmount(e.target.value)}
          />
        </div>
        <Button onClick={() => updateMutation.mutate()} disabled={!canSave || updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "Saved" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AdminPricingContent() {
  const { data: plans } = useSuspenseQuery(adminPricingQueryOptions());

  if (!plans?.pro || !plans?.premium) {
    return (
      <main className="container mx-auto max-w-lg py-8">
        <p className="text-destructive">Plans not found.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/admin">Back to Admin</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      <ContentHeader
        title="Subscription Pricing"
        subtitle="Set prices for Pro and Premium. These appear on the payment page, subscription page, and landing."
        className="mb-0"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <PlanEditor
          planId="pro"
          title="Pro"
          description="Email reminders, unlimited lists, partner sharing, full My Expenses."
          plan={plans.pro}
        />
        <PlanEditor
          planId="premium"
          title="Premium"
          description="Everything in Pro plus rent tracker and payment tracker."
          plan={plans.premium}
        />
      </div>
      <Button variant="outline" asChild>
        <Link href="/admin">Back to dashboard</Link>
      </Button>
    </main>
  );
}

export default function AdminPricingPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    }>
      <AdminPricingContent />
    </Suspense>
  );
}
