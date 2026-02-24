"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { loadExpenseData, updateNetTakeHome } from "@/actions/budget";
import { FREE_TIER_EXPENSE_LIMIT } from "@/types/database.types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, AlertTriangle } from "lucide-react";
import { Popover } from "@/components/ui/popover";

type FinancialStatus = "overdraft" | "on_track" | "left_over" | "no_expenses";

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
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [hasEntries, setHasEntries] = useState(false);
  const [freeTierLimitApplied, setFreeTierLimitApplied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadExpenseData().then((data) => {
      if (data) {
        setNetTakeHome(data.netTakeHome);
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
        setTotalExpenses(0);
        setHasEntries(false);
        setFreeTierLimitApplied(false);
      }
    });
  }, [user, pathname, refreshKey]);

  useEffect(() => {
    if (editOpen && netTakeHome != null) setEditValue(String(netTakeHome));
  }, [editOpen, netTakeHome]);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseInt(editValue.replace(/\D/g, ""), 10) || 0;
    setSaving(true);
    const result = await updateNetTakeHome(value);
    setSaving(false);
    if (result.error) {
      showError(result.error);
    } else {
      setNetTakeHome(value);
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
          {netTakeHome != null && netTakeHome > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setEditOpen(true)}
              aria-label="Edit net take-home pay"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit net take-home pay</DialogTitle>
            <DialogDescription>Your monthly income after tax and deductions.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-net">Amount (PHP)</Label>
              <Input
                id="edit-net"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
              />
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
