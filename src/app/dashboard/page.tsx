"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadExpenseData, updateNetTakeHome, addExpense } from "@/actions/budget";
import { useUser } from "@/hooks/use-user";
import { useBudgetRefresh } from "@/contexts/budget-refresh";
import type { ExpenseCategoryKey } from "@/types/database.types";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import type { ExpenseEntryRow } from "@/actions/budget";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSnackbar } from "@/components/ui/snackbar-provider";

function groupEntriesByCategory(entries: ExpenseEntryRow[]) {
  const map = new Map<ExpenseCategoryKey, ExpenseEntryRow[]>();
  for (const entry of entries) {
    const list = map.get(entry.category_id) ?? [];
    list.push(entry);
    map.set(entry.category_id, list);
  }
  return map;
}

function getCategoryLabel(id: ExpenseCategoryKey): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const showEditNetTakeHome = searchParams.get("edit") === "net-take-home";
  const [netTakeHome, setNetTakeHome] = useState(0);
  const [entries, setEntries] = useState<ExpenseEntryRow[]>([]);
  const [netTakeHomeInput, setNetTakeHomeInput] = useState("");
  const [addCategory, setAddCategory] = useState<ExpenseCategoryKey | "">("");
  const [addAmount, setAddAmount] = useState("");
  const { showError: showSnackbar } = useSnackbar();
  const { refreshBudget } = useBudgetRefresh();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [addStatus, setAddStatus] = useState<"idle" | "saving" | "error">("idle");

  const load = useCallback(() => {
    loadExpenseData().then((data) => {
      if (data) {
        setNetTakeHome(data.netTakeHome);
        setNetTakeHomeInput(data.netTakeHome > 0 ? String(data.netTakeHome) : "");
        setEntries(data.entries);
      }
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    load();
  }, [user, loading, router, load]);

  const totalExpenses = entries.reduce((sum, e) => sum + e.amount, 0);
  const balance = netTakeHome - totalExpenses;
  const grouped = groupEntriesByCategory(entries);

  async function handleSaveNetTakeHome() {
    const value = parseInt(netTakeHomeInput.replace(/\D/g, ""), 10) || 0;
    setSaveStatus("saving");
    const result = await updateNetTakeHome(value);
    if (result.error) {
      showSnackbar(result.error);
      setSaveStatus("error");
    } else {
      setNetTakeHome(value);
      setSaveStatus("saved");
      load();
      refreshBudget();
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (showEditNetTakeHome) router.replace("/dashboard");
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!addCategory || !addAmount) return;
    const amount = parseInt(addAmount.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) return;
    setAddStatus("saving");
    const result = await addExpense(addCategory as ExpenseCategoryKey, amount);
    if (result.error) {
      showSnackbar(result.error);
      setAddStatus("error");
    } else {
      setAddAmount("");
      load();
      refreshBudget();
      setAddStatus("idle");
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="mb-2 text-2xl font-semibold">My budget</h1>
      <p className="mb-8 text-muted-foreground">
        Set your take-home pay, then add expenses. Add another line anytime for expenses you forgot.
      </p>

      {/* Net take-home: show only when not set or when editing via bar */}
      {(netTakeHome === 0 || showEditNetTakeHome) && (
        <Card className="mb-8 max-w-xl">
          <CardHeader>
            <CardTitle>Net take-home pay</CardTitle>
            <CardDescription>Your monthly income after tax and deductions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-2 min-w-[140px]">
              <Label htmlFor="net">Amount (PHP)</Label>
              <Input
                id="net"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={netTakeHomeInput}
                onChange={(e) => setNetTakeHomeInput(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button
              type="button"
              onClick={handleSaveNetTakeHome}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped expenses (permanent) */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Expenses by category</h2>
        {entries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No expenses yet. Add one below.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries())
              .sort((a, b) => getCategoryLabel(a[0]).localeCompare(getCategoryLabel(b[0])))
              .map(([categoryId, categoryEntries]) => {
                const total = categoryEntries.reduce((s, e) => s + e.amount, 0);
                return (
                  <Card key={categoryId}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{getCategoryLabel(categoryId)}</CardTitle>
                        <Badge variant="secondary">{formatCurrency(total)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {categoryEntries.map((entry) => (
                          <li key={entry.id} className="flex justify-between">
                            <span>—</span>
                            <span>{formatCurrency(entry.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* Add expense */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add expense</CardTitle>
          <CardDescription>Add another line for an expense you forgot.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddExpense} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] space-y-2">
              <Label>Category</Label>
              <Select value={addCategory} onValueChange={(v) => setAddCategory(v as ExpenseCategoryKey)}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[120px] space-y-2">
              <Label>Amount (PHP)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button type="submit" disabled={addStatus === "saving" || !addCategory || !addAmount}>
              {addStatus === "saving" ? "Adding…" : "Add expense"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>Total expenses vs take-home.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">Net take-home</span>
            <span>{formatCurrency(netTakeHome)}</span>
          </p>
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total expenses</span>
            <span>{formatCurrency(totalExpenses)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Balance</span>
            <span className={balance < 0 ? "text-destructive" : balance > 0 ? "text-emerald-600" : ""}>
              {balance < 0 ? "-" : ""}{formatCurrency(Math.abs(balance))}
              {balance < 0 && " (overdraft)"}
              {balance > 0 && " (left over)"}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
