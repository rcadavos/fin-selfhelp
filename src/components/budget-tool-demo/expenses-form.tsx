"use client";

import { Suspense, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { useExpenseCategories } from "@/hooks/use-expense-categories";

type ExpensesFormProps = {
  expenses: Record<string, number>;
  onExpenseChange: (category: string, value: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  onSave?: () => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  saveError?: string | null;
  className?: string;
};

function ExpensesFormInner({
  expenses,
  onExpenseChange,
  onBack,
  onSubmit,
  onSave,
  saveStatus = "idle",
  saveError,
  className,
}: ExpensesFormProps) {
  const { data: categories } = useExpenseCategories();
  const handleChange = useCallback(
    (category: string) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "");
        const value = raw === "" ? 0 : Math.max(0, parseInt(raw, 10));
        onExpenseChange(category, value);
      },
    [onExpenseChange]
  );

  const total = Object.values(expenses).reduce((a, b) => a + b, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Where did your money go?</CardTitle>
        <CardDescription>
          Enter spending per category (monthly). Use 0 for categories that don&apos;t apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => {
            const value = expenses[cat.id];
            const displayValue = value === 0 ? "" : value.toLocaleString("en-PH");
            return (
              <div key={cat.id} className="space-y-2">
                <Label htmlFor={`expense-${cat.id}`}>{cat.label}</Label>
                <Input
                  id={`expense-${cat.id}`}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={displayValue}
                  onChange={handleChange(cat.id)}
                />
                {value > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(value)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          Total expenses: {formatCurrency(total)}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          {onSave && (
            <Button
              type="button"
              variant="secondary"
              onClick={onSave}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}
            </Button>
          )}
          <Button onClick={onSubmit}>See result</Button>
        </div>
        {saveError && (
          <p className="text-sm text-destructive">{saveError}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpensesForm(props: ExpensesFormProps) {
  return (
    <Suspense
      fallback={
        <Card className={props.className}>
          <CardHeader>
            <CardTitle>Where did your money go?</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center">
              <Image src="/favicon.png" alt="" aria-hidden className="h-40 w-40 animate-breathing" width={48} height={48} />
            </div>
          </CardContent>
        </Card>
      }
    >
      <ExpensesFormInner {...props} />
    </Suspense>
  );
}
