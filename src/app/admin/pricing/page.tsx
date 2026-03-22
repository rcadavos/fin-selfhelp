"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { subscriptionPlanQueryOptions } from "@/lib/query/subscription-plan";
import { updateSubscriptionPlan } from "@/actions/subscription-plan";
import { Loader2 } from "lucide-react";

const CURRENCIES = ["USD", "PHP", "EUR", "GBP"];
const INTERVALS = ["month", "year"];

export default function AdminPricingPage() {
  const queryClient = useQueryClient();
  const { data: plan, isLoading, error } = useQuery(adminPricingQueryOptions());
  const [name, setName] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [interval, setInterval] = useState("month");
  const [originalPriceAmount, setOriginalPriceAmount] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setName(plan.name);
    setPriceAmount(String(plan.priceAmount));
    setPriceCurrency(plan.priceCurrency);
    setInterval(plan.interval);
    setOriginalPriceAmount(plan.originalPriceAmount != null ? String(plan.originalPriceAmount) : "");
  }, [plan?.id]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const result = await updateSubscriptionPlan({
        name: name.trim(),
        priceAmount: Number(priceAmount) || 0,
        priceCurrency: priceCurrency.trim(),
        interval: interval.trim(),
        originalPriceAmount:
          originalPriceAmount === "" ? null : (parseFloat(originalPriceAmount) || null),
      });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPricingQueryOptions().queryKey });
      queryClient.invalidateQueries({ queryKey: subscriptionPlanQueryOptions().queryKey });
      setActionError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const canSave =
    plan &&
    (name.trim() !== plan.name ||
      Number(priceAmount) !== plan.priceAmount ||
      priceCurrency !== plan.priceCurrency ||
      interval !== plan.interval ||
      (originalPriceAmount === "" ? plan.originalPriceAmount != null : Number(originalPriceAmount) !== (plan.originalPriceAmount ?? -1)));

  if (isLoading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error || !plan) {
    return (
      <main className="container mx-auto max-w-lg py-8">
        <p className="text-destructive">{(error as Error)?.message ?? "Plan not found."}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/admin">Back to Admin</Link>
        </Button>
      </main>
    );
  }

  const displayName = name.trim() || plan.name;
  const displayPrice = priceAmount !== "" ? priceAmount : String(plan.priceAmount);
  const displayOriginal = originalPriceAmount !== "" ? originalPriceAmount : (plan.originalPriceAmount != null ? String(plan.originalPriceAmount) : "");

  return (
    <main className="container mx-auto max-w-lg py-8">
      <Card>
        <CardHeader>
          <CardTitle>Subscription pricing</CardTitle>
          <CardDescription>
            Set the plan name and price shown on the payment page, subscription page, and landing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          {saved && <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>}
          <div className="grid gap-2">
            <Label htmlFor="plan-name">Plan name</Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price-amount">Price amount</Label>
              <Input
                id="price-amount"
                type="number"
                min="0"
                step="0.01"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price-currency">Currency</Label>
              <Select value={priceCurrency} onValueChange={setPriceCurrency}>
                <SelectTrigger id="price-currency">
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
            <Label htmlFor="interval">Billing interval</Label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger id="interval">
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
            <Label htmlFor="original-price">Original price (optional, for strikethrough)</Label>
            <Input
              id="original-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave empty for no strikethrough"
              value={originalPriceAmount}
              onChange={(e) => setOriginalPriceAmount(e.target.value)}
            />
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Preview: <span className="font-medium text-foreground">{displayName}</span> —{" "}
            {displayOriginal ? (
              <>
                <span className="line-through">{displayOriginal}</span>{" "}
                <span className="text-primary">{displayPrice}</span>
              </>
            ) : (
              <span className="text-primary">{displayPrice}</span>
            )}{" "}
            {priceCurrency || plan.priceCurrency} / {interval || plan.interval}
          </div>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!canSave || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              "Saved"
            ) : (
              "Save pricing"
            )}
          </Button>
        </CardContent>
      </Card>
      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link href="/admin">Back to Users</Link>
        </Button>
      </div>
    </main>
  );
}
