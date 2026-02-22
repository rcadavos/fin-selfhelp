"use client";

import { useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface IncomeFormProps {
  netTakeHome: number;
  onNetTakeHomeChange: (value: number) => void;
  onNext: () => void;
  onSave?: () => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  saveError?: string | null;
  className?: string;
}

export function IncomeForm({
  netTakeHome,
  onNetTakeHomeChange,
  onNext,
  onSave,
  saveStatus = "idle",
  saveError,
  className,
}: IncomeFormProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      const value = raw === "" ? 0 : Math.max(0, parseInt(raw, 10));
      onNetTakeHomeChange(value);
    },
    [onNetTakeHomeChange]
  );

  const displayValue =
    netTakeHome === 0 ? "" : netTakeHome.toLocaleString("en-PH");

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Net take-home pay</CardTitle>
        <CardDescription>
          Enter your total income after tax and deductions (monthly).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="net-take-home">Amount (PHP)</Label>
          <Input
            id="net-take-home"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={displayValue}
            onChange={handleChange}
            aria-describedby="net-take-home-hint"
          />
          <p id="net-take-home-hint" className="text-xs text-muted-foreground">
            {netTakeHome > 0 && formatCurrency(netTakeHome)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
          <Button onClick={onNext} disabled={netTakeHome <= 0}>
            Next: Expenses
          </Button>
        </div>
        {saveError && (
          <p className="text-sm text-destructive">{saveError}</p>
        )}
      </CardContent>
    </Card>
  );
}
