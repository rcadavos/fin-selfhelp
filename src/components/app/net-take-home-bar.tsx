"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadExpenseData } from "@/actions/budget";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useBudgetRefresh } from "@/contexts/budget-refresh";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

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
  const { refreshKey } = useBudgetRefresh();
  const [netTakeHome, setNetTakeHome] = useState<number | null>(null);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [hasEntries, setHasEntries] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadExpenseData().then((data) => {
      if (data) {
        setNetTakeHome(data.netTakeHome);
        const total = data.entries.reduce((s, e) => s + e.amount, 0);
        setTotalExpenses(total);
        setHasEntries(data.entries.length > 0);
      } else {
        setNetTakeHome(null);
        setTotalExpenses(0);
        setHasEntries(false);
      }
    });
  }, [user, pathname, refreshKey]);

  if (!user) return null;

  const status = netTakeHome != null ? getStatus(netTakeHome, totalExpenses, hasEntries) : null;
  const statusConfig =
    status === "overdraft"
      ? { label: "Overdraft", variant: "destructive" as const }
      : status === "left_over"
        ? { label: "Good standing", variant: "success" as const }
        : status === "on_track"
          ? { label: "On track", variant: "secondary" as const }
          : status === "no_expenses"
            ? { label: "No expenses set", variant: "outline" as const }
            : null;

  return (
    <div className="sticky top-14 z-40 flex w-full items-center justify-between gap-4 border-b bg-muted/30 px-4 py-2 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-muted/50">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">
          {netTakeHome != null ? (
            <>Net take-home: {formatCurrency(netTakeHome)}</>
          ) : (
            "Net take-home: —"
          )}
        </span>
        {netTakeHome != null && netTakeHome > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href="/dashboard?edit=net-take-home" aria-label="Edit net take-home pay">
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      {statusConfig && (
        <div className="flex shrink-0 items-center">
          <Badge
            variant={statusConfig.variant}
            className="px-4 py-2 text-base font-semibold sm:px-5 sm:py-2.5 sm:text-lg"
          >
            {statusConfig.label}
          </Badge>
        </div>
      )}
    </div>
  );
}
