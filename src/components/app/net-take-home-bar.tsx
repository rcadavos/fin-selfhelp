"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { loadExpenseData, saveIncomeEntries } from "@/actions/budget";
import { FREE_TIER_EXPENSE_LIMIT } from "@/types/database.types";
import { INCOME_CATEGORIES } from "@/types/database.types";
import type { IncomeCategoryKey } from "@/types/database.types";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useBudgetRefresh } from "@/contexts/budget-refresh";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Popover } from "@/components/ui/popover";

type FinancialStatus = "overdraft" | "on_track" | "left_over" | "no_expenses";

type IncomeRowEdit = { category_key: IncomeCategoryKey; amount: string };

function getStatus(netTakeHome: number, totalExpenses: number, hasEntries: boolean): FinancialStatus | null {
  if (!hasEntries) return "no_expenses";
  const balance = netTakeHome - totalExpenses;
  if (balance < 0) return "overdraft";
  if (balance > 0) return "left_over";
  return "on_track";
}

export function NetTakeHomeBar() {
  const { user } = useUser();
  const pathname = usePathname();
  const { refreshKey, refreshBudget } = useBudgetRefresh();
  const { showError } = useSnackbar();
  const [netTakeHome, setNetTakeHome] = useState<number | null>(null);
  const [incomeEntries, setIncomeEntries] = useState<{ id: string; category_key: string; amount: number }[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [hasEntries, setHasEntries] = useState(false);
  const [freeTierLimitApplied, setFreeTierLimitApplied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRows, setEditRows] = useState<IncomeRowEdit[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadExpenseData().then((data) => {
      if (data) {
        setNetTakeHome(data.netTakeHome);
        setIncomeEntries(data.incomeEntries);
        const entries = data.entries;
        const isSubscriber = data.isSubscriber;
        const limited = !isSubscriber && entries.length > FREE_TIER_EXPENSE_LIMIT;
        const entriesCounted = limited ? entries.slice(0, FREE_TIER_EXPENSE_LIMIT) : entries;
        const total = entriesCounted.reduce((s, e) => s + e.amount, 0);
        setTotalExpenses(total);
        setHasEntries(entriesCounted.length > 0);
        setFreeTierLimitApplied(limited);
      } else {
        setNetTakeHome(null);
        setIncomeEntries([]);
        setTotalExpenses(0);
        setHasEntries(false);
        setFreeTierLimitApplied(false);
      }
    });
  }, [user, pathname, refreshKey]);

  useEffect(() => {
    if (editOpen) {
      if (incomeEntries.length > 0) {
        setEditRows(
          incomeEntries.map((e) => ({
            category_key: (e.category_key as IncomeCategoryKey) || "salary",
            amount: String(e.amount),
          }))
        );
      } else if (netTakeHome != null && netTakeHome > 0) {
        setEditRows([{ category_key: "salary", amount: String(netTakeHome) }]);
      } else {
        setEditRows([{ category_key: "salary", amount: "" }]);
      }
    }
  }, [editOpen, incomeEntries, netTakeHome]);

  const editTotal = useMemo(() => {
    return editRows.reduce((s, r) => s + (parseInt(r.amount.replace(/\D/g, ""), 10) || 0), 0);
  }, [editRows]);

  function setEditRow(index: number, update: Partial<IncomeRowEdit>) {
    setEditRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
  }

  function addRow() {
    setEditRows((prev) => [...prev, { category_key: "salary", amount: "" }]);
  }

  function removeRow(index: number) {
    setEditRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const rows = editRows.map((r) => ({
      category_key: r.category_key,
      amount: parseInt(r.amount.replace(/\D/g, ""), 10) || 0,
    }));
    const valid = rows.filter((r) => r.amount > 0);
    if (valid.length === 0) {
      showError("Add at least one income row with amount greater than 0.");
      return;
    }
    setSaving(true);
    const result = await saveIncomeEntries(valid);
    setSaving(false);
    if (result.error) {
      showError(result.error);
    } else {
      const total = valid.reduce((s, r) => s + r.amount, 0);
      setNetTakeHome(total);
      setIncomeEntries(valid.map((r, i) => ({ id: String(i), category_key: r.category_key, amount: r.amount })));
      refreshBudget();
      setEditOpen(false);
    }
  }

  if (!user) return null;

  const status = netTakeHome != null ? getStatus(netTakeHome, totalExpenses, hasEntries) : null;
  const statusConfig =
    status === "overdraft"
      ? { label: "Overdraft", variant: "destructive" as const }
      : status === "left_over"
        ? { label: "Good Standing", variant: "success" as const }
        : status === "on_track"
          ? { label: "On track", variant: "secondary" as const }
          : status === "no_expenses"
            ? { label: "No expenses set", variant: "outline" as const }
            : null;

  return (
    <>
      <div className="sticky top-14 z-40 flex w-full items-center justify-between gap-4 border-b bg-muted/30 px-4 py-2 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="text-base text-muted-foreground sm:text-lg">
            {netTakeHome != null ? (
              <>
                Net take-home: <span className="font-bold text-foreground">{formatCurrency(netTakeHome)}</span>
              </>
            ) : (
              "Net take-home: —"
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setEditOpen(true)}
            aria-label="Edit net take-home pay"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        {statusConfig && (
          <div className="flex shrink-0 items-center gap-2">
            {freeTierLimitApplied && (
              <Popover
                align="end"
                trigger={
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-600 hover:bg-amber-500/15 dark:text-amber-400"
                    aria-label="Status may not include all expenses (free tier)"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                }
                content="Status is not accurate. Not all expenses are included because you're on the free tier (max 5). Subscribe to include all."
              />
            )}
            <Badge
              variant={statusConfig.variant}
              className="px-4 py-2 text-base font-semibold sm:px-5 sm:py-2.5 sm:text-lg"
            >
              {statusConfig.label}
            </Badge>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Net take-home pay</DialogTitle>
            <DialogDescription>
              Add income by category. Total is shown below and saved when you click Save.
            </DialogDescription>
          </DialogHeader>

          {/* Total above the card */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">Total (before save)</p>
            <p className="text-xl font-bold">{formatCurrency(editTotal)}</p>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Income by category</Label>
              <div className="p-1 space-y-2 max-h-64 overflow-y-auto">
                {editRows.map((row, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Select
                      value={row.category_key}
                      onValueChange={(v) => setEditRow(index, { category_key: v as IncomeCategoryKey })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <AmountInput
                      placeholder="0"
                      className="w-28"
                      value={row.amount}
                      onChange={(raw) => setEditRow(index, { amount: raw })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(index)}
                      disabled={editRows.length <= 1}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
                <Plus className="h-4 w-4" />
                Add row
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
