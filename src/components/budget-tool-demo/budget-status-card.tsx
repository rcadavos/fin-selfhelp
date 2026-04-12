"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import type { BudgetSummary } from "@/types/database.types";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ExpenseCategoryTable } from "./expense-category-table";

type BudgetStatusCardProps = {
  summary: BudgetSummary;
  onReset: () => void;
  onSave?: () => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  saveError?: string | null;
  className?: string;
};

export function BudgetStatusCard({
  summary,
  onReset,
  onSave,
  saveStatus = "idle",
  saveError,
  className,
}: BudgetStatusCardProps) {
  const isOverdraft = summary.status === "overdraft";
  const isExtra = summary.status === "extra";
  const isBreakEven = summary.status === "break_even";

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Cashflow result</CardTitle>
          <Badge
            variant={
              isOverdraft
                ? "destructive"
                : isExtra
                  ? "success"
                  : "secondary"
            }
          >
            {isOverdraft
              ? "Overdraft"
              : isExtra
                ? "Money left over"
                : "Break-even"}
          </Badge>
        </div>
        <CardDescription>
          Net take-home: <span className="font-bold text-foreground">{formatCurrency(summary.netTakeHome)}</span> — Total expenses:{" "}
          <span className="font-bold text-foreground">{formatCurrency(summary.totalExpenses)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
          {isOverdraft && (
            <TrendingDown className="h-8 w-8 shrink-0 text-destructive" />
          )}
          {isExtra && (
            <TrendingUp className="h-8 w-8 shrink-0 text-emerald-600" />
          )}
          {isBreakEven && (
            <Minus className="h-8 w-8 shrink-0 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Balance</p>
            <p
              className={cn(
                "text-2xl font-bold",
                isOverdraft && "text-destructive",
                isExtra && "text-emerald-600"
              )}
            >
              {isOverdraft ? "-" : ""}
              {formatCurrency(Math.abs(summary.balance))}
              {isOverdraft && " (short)"}
              {isExtra && " (left over)"}
            </p>
          </div>
        </div>

        {summary.byCategory.some((r) => r.amount > 0) && (
          <div>
            <h4 className="mb-2 text-sm font-medium">Spending by category</h4>
            <ExpenseCategoryTable
              data={summary.byCategory
                .filter((r) => r.amount > 0)
                .sort((a, b) => b.amount - a.amount)}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
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
          <Button variant="outline" onClick={onReset} className="w-full">
            Start over
          </Button>
        </div>
        {saveError && (
          <p className="text-sm text-destructive">{saveError}</p>
        )}
      </CardContent>
    </Card>
  );
}
