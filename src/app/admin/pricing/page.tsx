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
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminPricingQueryOptions } from "@/lib/query/admin-pricing";
import { subscriptionPlansQueryOptions } from "@/lib/query/subscription-plan";
import {
  createSubscriptionPlan,
  updateSubscriptionPlanById,
  type SubscriptionPlanRow,
} from "@/actions/subscription-plan";
import { ContentHeader } from "@/components/app/content-header";
import { Loader2, Plus } from "lucide-react";

const CURRENCIES = ["USD", "PHP", "EUR", "GBP"];
const INTERVALS = ["month", "year"];

type PlanEditorProps = {
  planId: string;
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
  const [enabled, setEnabled] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(plan.name);
    setPriceAmount(String(plan.priceAmount));
    setPriceCurrency(plan.priceCurrency);
    setInterval(plan.interval);
    setOriginalPriceAmount(plan.originalPriceAmount != null ? String(plan.originalPriceAmount) : "");
    setEnabled(plan.enabled);
  }, [
    plan.id,
    plan.name,
    plan.priceAmount,
    plan.priceCurrency,
    plan.interval,
    plan.originalPriceAmount,
    plan.enabled,
  ]);

  function invalidatePlans() {
    queryClient.invalidateQueries({ queryKey: adminPricingQueryOptions().queryKey });
    queryClient.invalidateQueries({ queryKey: subscriptionPlansQueryOptions().queryKey });
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const result = await updateSubscriptionPlanById(planId, {
        name: name.trim(),
        priceAmount: Number(priceAmount) || 0,
        priceCurrency: priceCurrency.trim(),
        interval: interval.trim(),
        originalPriceAmount: originalPriceAmount === "" ? null : parseFloat(originalPriceAmount) || null,
        enabled,
      });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      invalidatePlans();
      setActionError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const result = await updateSubscriptionPlanById(planId, { enabled: next });
      if (result.error) throw new Error(result.error);
      return next;
    },
    onSuccess: (next) => {
      setEnabled(next);
      invalidatePlans();
      setActionError(null);
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const canSave =
    name.trim() !== plan.name ||
    Number(priceAmount) !== plan.priceAmount ||
    priceCurrency !== plan.priceCurrency ||
    interval !== plan.interval ||
    (originalPriceAmount === "" ? plan.originalPriceAmount != null : Number(originalPriceAmount) !== (plan.originalPriceAmount ?? -1)) ||
    enabled !== plan.enabled;

  return (
    <Card className={!plan.enabled ? "border-dashed opacity-90" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {title}
              {!plan.enabled && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Off
                </span>
              )}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor={`${planId}-enabled`} className="text-xs text-muted-foreground">
              {plan.enabled ? "Enabled" : "Disabled"}
            </Label>
            <ToggleSwitch
              id={`${planId}-enabled`}
              checked={enabled}
              onCheckedChange={(next) => toggleEnabledMutation.mutate(next)}
              disabled={toggleEnabledMutation.isPending}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        {saved && <p className="text-sm text-primary">Saved.</p>}
        <div className="grid gap-2">
          <Label htmlFor={`${planId}-name`}>Plan name</Label>
          <Input id={`${planId}-name`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${planId}-price`}>Price amount</Label>
            <AmountInput
              id={`${planId}-price`}
              value={priceAmount}
              onChange={setPriceAmount}
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
          <AmountInput
            id={`${planId}-original`}
            placeholder="Leave empty for no strikethrough"
            value={originalPriceAmount}
            onChange={setOriginalPriceAmount}
          />
        </div>
        <Button onClick={() => updateMutation.mutate()} disabled={!canSave || updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "Saved" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CreatePlanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [priceAmount, setPriceAmount] = useState("0");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [interval, setInterval] = useState("month");
  const [originalPriceAmount, setOriginalPriceAmount] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setId("");
      setName("");
      setPriceAmount("0");
      setPriceCurrency("USD");
      setInterval("month");
      setOriginalPriceAmount("");
      setEnabled(true);
      setError(null);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await createSubscriptionPlan({
        id: id.trim(),
        name: name.trim(),
        priceAmount: Number(priceAmount) || 0,
        priceCurrency: priceCurrency.trim() || "USD",
        interval: interval.trim() || "month",
        originalPriceAmount: originalPriceAmount === "" ? null : parseFloat(originalPriceAmount) || null,
        enabled,
      });
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPricingQueryOptions().queryKey });
      queryClient.invalidateQueries({ queryKey: subscriptionPlansQueryOptions().queryKey });
      setError(null);
      onOpenChange(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  const canSubmit = id.trim().length > 0 && name.trim().length > 0 && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create new subscription</DialogTitle>
          <DialogDescription>
            Add a new plan row. The id is used internally and cannot be changed later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid gap-2">
            <Label htmlFor="new-plan-id">Plan id</Label>
            <Input
              id="new-plan-id"
              placeholder="e.g. platinum"
              value={id}
              onChange={(e) => setId(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, dashes, and underscores only.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-plan-name">Display name</Label>
            <Input
              id="new-plan-name"
              placeholder="e.g. Platinum"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-plan-price">Price amount</Label>
              <AmountInput
                id="new-plan-price"
                value={priceAmount}
                onChange={setPriceAmount}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-plan-currency">Currency</Label>
              <Select value={priceCurrency} onValueChange={setPriceCurrency}>
                <SelectTrigger id="new-plan-currency">
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
            <Label htmlFor="new-plan-interval">Billing interval</Label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger id="new-plan-interval">
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
            <Label htmlFor="new-plan-original">Original price (optional)</Label>
            <AmountInput
              id="new-plan-original"
              placeholder="Leave empty for no strikethrough"
              value={originalPriceAmount}
              onChange={setOriginalPriceAmount}
            />
          </div>
          <div className="flex items-center justify-between surface border border-border/60 bg-muted/30 px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="new-plan-enabled" className="text-sm font-medium">
                Enabled
              </Label>
              <p className="text-xs text-muted-foreground">Off plans stay in the database but are hidden from users.</p>
            </div>
            <ToggleSwitch id="new-plan-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={!canSubmit}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminPricingContent() {
  const { data: plans } = useSuspenseQuery(adminPricingQueryOptions());
  const [createOpen, setCreateOpen] = useState(false);

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

  const extras = plans.extras ?? [];

  return (
    <main className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      <ContentHeader
        title="Subscription Pricing"
        subtitle="Set prices and toggle plans on or off. These appear on the payment page, subscription page, and landing."
        className="mb-0"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create new subscription
        </Button>
      </div>
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
        {extras.map((plan) => (
          <PlanEditor
            key={plan.id}
            planId={plan.id}
            title={plan.name}
            description={`Custom plan • id: ${plan.id}`}
            plan={plan}
          />
        ))}
      </div>
      <Button variant="outline" asChild>
        <Link href="/admin">Back to dashboard</Link>
      </Button>
      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />
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
