"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Receipt } from "lucide-react";
import { ContentHeader } from "@/components/app/content-header";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { loadSharedBillsData, granteeSharedToggleBillPayment, type BillRow, type SharedBillsData } from "@/actions/bills";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { formatCurrency, cn } from "@/lib/utils";
import { getDueDayOfMonthFromYmd, effectiveDueDateInPaidMonth, parseYmToYearMonth } from "@/lib/expense-due-date";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDueDay(bill: BillRow, paidMonth: string): string {
  if (bill.billing_period === "yearly") {
    const day = getDueDayOfMonthFromYmd(bill.due_date);
    const monthName = MONTH_NAMES[(bill.due_month ?? 1) - 1] ?? "";
    return `${monthName} ${day}`;
  }
  if (bill.billing_period === "quarterly") {
    const day = getDueDayOfMonthFromYmd(bill.due_date);
    const ym = parseYmToYearMonth(paidMonth);
    if (!ym || !day) return "—";
    const quarter = Math.floor((ym.month1to12 - 1) / 3) + 1;
    const qStartMonthName = MONTH_NAMES[Math.floor((ym.month1to12 - 1) / 3) * 3];
    return `Q${quarter} • ${qStartMonthName} ${day}`;
  }
  const eff = effectiveDueDateInPaidMonth(bill.due_date, paidMonth);
  if (!eff) return "—";
  return `Due ${eff.getDate()} ${MONTH_NAMES[eff.getMonth()]}`;
}

function effectiveBillDueDate(bill: BillRow, today: Date, paidMonthYm: string): Date | null {
  const dueDay = getDueDayOfMonthFromYmd(bill.due_date);
  if (!dueDay) return null;
  if (bill.billing_period === "yearly") {
    const dueMonth1 = bill.due_month ?? 1;
    const year = today.getFullYear();
    const lastDay = new Date(year, dueMonth1, 0).getDate();
    return new Date(year, dueMonth1 - 1, Math.min(dueDay, lastDay));
  }
  if (bill.billing_period === "quarterly") {
    const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
    const year = today.getFullYear();
    const lastDay = new Date(year, qStartMonth + 1, 0).getDate();
    return new Date(year, qStartMonth, Math.min(dueDay, lastDay));
  }
  return effectiveDueDateInPaidMonth(bill.due_date, paidMonthYm);
}

type PeriodTab = "monthly" | "quarterly" | "yearly";

type Props = { params: Promise<{ grantorUserId: string }> };

export function SharedPartnerBillsPage({ params }: Props) {
  const { grantorUserId } = use(params);
  const paidMonth = getCurrentPaidMonth();
  const { data: dbCategories = [] } = useQuery(categoriesQueryOptions());
  const [data, setData] = useState<SharedBillsData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<PeriodTab>("monthly");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await loadSharedBillsData(grantorUserId, paidMonth);
    setLoading(false);
    if (!res) { setErr("No shared access to this account's bills."); return; }
    setData(res);
  }, [grantorUserId, paidMonth]);

  useEffect(() => { void load(); }, [load]);

  const bills = data?.bills ?? [];
  const paidIds = useMemo(() => new Set(data?.paidBillIds ?? []), [data]);
  const paymentAmountByBillId = data?.paymentAmountByBillId ?? {};

  const categories = useMemo(
    () => dbCategories.map((c) => ({ id: c.id, label: c.label, bgClass: c.bgClass })),
    [dbCategories],
  );

  function getCategoryColor(bgClass: string): string {
    const match = bgClass.match(/bg-(\w+)-\d+/);
    if (!match) return "#94a3b8";
    const map: Record<string, string> = {
      red: "#ef4444", orange: "#f97316", amber: "#f59e0b", yellow: "#eab308",
      lime: "#84cc16", green: "#22c55e", emerald: "#10b981", teal: "#14b8a6",
      cyan: "#06b6d4", sky: "#0ea5e9", blue: "#3b82f6", indigo: "#6366f1",
      violet: "#8b5cf6", purple: "#a855f7", fuchsia: "#d946ef", pink: "#ec4899",
      rose: "#f43f5e", slate: "#64748b", gray: "#6b7280",
    };
    return map[match[1]] ?? "#94a3b8";
  }

  const filteredBills = useMemo(
    () => bills.filter((b) => b.billing_period === activeTab),
    [bills, activeTab],
  );

  const sortedBills = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...filteredBills].sort((a, b) => {
      const rankA = paidIds.has(a.id) ? 2 : (effectiveBillDueDate(a, today, paidMonth) ?? new Date(9999, 0)) < today ? 0 : 1;
      const rankB = paidIds.has(b.id) ? 2 : (effectiveBillDueDate(b, today, paidMonth) ?? new Date(9999, 0)) < today ? 0 : 1;
      return rankA - rankB;
    });
  }, [filteredBills, paidIds, paidMonth]);

  const { total, remaining, unpaid } = useMemo(() => {
    const t = filteredBills.reduce((s, b) => s + b.amount, 0);
    const paid = filteredBills.reduce((s, b) => s + (paymentAmountByBillId[b.id] ?? 0), 0);
    return {
      total: t,
      remaining: Math.max(0, t - paid),
      unpaid: filteredBills.filter((b) => !paidIds.has(b.id)).length,
    };
  }, [filteredBills, paidIds, paymentAmountByBillId]);

  const tabCounts = useMemo(() => ({
    monthly: bills.filter((b) => b.billing_period === "monthly").length,
    quarterly: bills.filter((b) => b.billing_period === "quarterly").length,
    yearly: bills.filter((b) => b.billing_period === "yearly").length,
  }), [bills]);

  async function handleToggle(billId: string) {
    if (!data) return;
    setPendingIds((prev) => new Set(prev).add(billId));

    // Optimistic update — keep paidBillIds and paymentAmountByBillId in sync.
    const wasPaid = paidIds.has(billId);
    const billAmount = bills.find((b) => b.id === billId)?.amount ?? 0;
    setData((d) => {
      if (!d) return d;
      if (wasPaid) {
        const next = { ...d.paymentAmountByBillId };
        delete next[billId];
        return {
          ...d,
          paidBillIds: d.paidBillIds.filter((id) => id !== billId),
          paymentAmountByBillId: next,
        };
      }
      return {
        ...d,
        paidBillIds: [...d.paidBillIds, billId],
        paymentAmountByBillId: { ...d.paymentAmountByBillId, [billId]: billAmount },
      };
    });

    const res = await granteeSharedToggleBillPayment(grantorUserId, billId, paidMonth);
    setPendingIds((prev) => { const s = new Set(prev); s.delete(billId); return s; });
    if (res.error) void load();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-muted-foreground">
        Loading bills…
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm text-destructive">{err ?? "Could not load bills."}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/account/shared">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <ContentHeader
        title="Partner's Bills"
        subtitle="Read-only view. You can mark bills paid or unpaid for this month."
        icon={Receipt}
      />

      <p className="text-xs text-muted-foreground surface border border-muted/80 bg-muted/20 px-3 py-2">
        Read-only access — you can toggle paid status but cannot add, edit, or delete bills.
      </p>

      {/* Summary */}
      <div className="flex flex-row gap-3">
        <div className="flex-1 surface border bg-card px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground capitalize">Bills – {activeTab}</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(total, "USD")}</p>
          <p className="text-[11px] text-muted-foreground">{tabCounts[activeTab]} bill{tabCounts[activeTab] !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 surface border bg-card px-4 py-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground">Remaining</p>
          <p className={cn("mt-0.5 text-lg font-bold tabular-nums", remaining > 0 ? "text-warning" : "")}>
            {formatCurrency(remaining, "USD")}
          </p>
          <p className="text-[11px] text-muted-foreground">{unpaid} unpaid</p>
        </div>
      </div>

      {/* Tabs + list */}
      <div>
        <div className="mb-3 flex items-center gap-1 surface border bg-muted/40 w-fit p-0.5">
          {(["monthly", "quarterly", "yearly"] as PeriodTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors capitalize",
                activeTab === tab
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
              {tabCounts[tab] > 0 && <span className="ml-1 opacity-60">{tabCounts[tab]}</span>}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {sortedBills.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No {activeTab} bills.
            </div>
          ) : (
            sortedBills.map((bill) => {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const eff = effectiveBillDueDate(bill, today, paidMonth);
              const isPaid = paidIds.has(bill.id);
              const isOverdue = !isPaid && !!eff && eff < today;
              const isPending = pendingIds.has(bill.id);
              const cat = categories.find((c) => c.id === bill.category_id);
              const dotColor = getCategoryColor(cat?.bgClass ?? "");

              return (
                <div
                  key={bill.id}
                  className={cn(
                    "flex items-center gap-3 surface border px-4 py-3",
                    isPaid
                      ? "border-primary/30 bg-primary/5"
                      : isOverdue
                        ? "border-warning/40 bg-warning/10"
                        : "border-border bg-card",
                  )}
                >
                  <button
                    onClick={() => handleToggle(bill.id)}
                    disabled={isPending}
                    className="flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                    aria-label={isPaid ? "Mark unpaid" : "Mark paid"}
                  >
                    {isPaid
                      ? <CheckCircle2 className="h-5 w-5 text-primary" />
                      : <Circle className={cn("h-5 w-5", isOverdue && "text-warning")} />}
                  </button>

                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={cn("truncate text-sm font-medium", isPaid && "line-through text-muted-foreground")}>
                        {bill.note ?? cat?.label}
                      </p>
                      {isPaid
                        ? <span className="shrink-0 rounded-full border border-primary/60 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Paid</span>
                        : isOverdue
                          ? <span className="shrink-0 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">Outstanding</span>
                          : <span className="shrink-0 rounded-full border border-muted-foreground/30 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Unpaid</span>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {cat?.label}
                      {formatDueDay(bill, paidMonth) && <span className="text-muted-foreground/60"> • {formatDueDay(bill, paidMonth)}</span>}
                    </p>
                  </div>

                  <p className={cn("flex-shrink-0 text-sm font-semibold tabular-nums", isPaid && "text-muted-foreground")}>
                    {formatCurrency(bill.amount, "USD")}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Button variant="outline" asChild>
        <Link href="/account/shared">Back to shared accounts</Link>
      </Button>
    </div>
  );
}
