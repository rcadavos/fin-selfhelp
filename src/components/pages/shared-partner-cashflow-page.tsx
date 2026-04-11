"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadSharedExpenseData, type ExpenseEntryRow } from "@/actions/budget";
import { getPaymentHistoryMonthsForGrantor, type PaymentMonthStats } from "@/actions/expense-payments";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { formatCurrency, cn } from "@/lib/utils";
import { CalendarRange, CheckCircle2, CircleDollarSign, ArrowUpRight, LayoutDashboard } from "lucide-react";

function groupByCategory(entries: ExpenseEntryRow[], categoryIds: string[]) {
  const map = new Map<string, ExpenseEntryRow[]>();
  for (const e of entries) {
    const list = map.get(e.category_id) ?? [];
    list.push(e);
    map.set(e.category_id, list);
  }
  return { map, categoryIds };
}

type SharedPartnerCashflowPageProps = {
  params: Promise<{ grantorUserId: string }>;
};

export function SharedPartnerCashflowPage({ params }: SharedPartnerCashflowPageProps) {
  const { grantorUserId } = use(params);
  const { data: categoriesFromDb = [] } = useQuery(categoriesQueryOptions());
  const [data, setData] = useState<Awaited<ReturnType<typeof loadSharedExpenseData>>>(null);
  const [history, setHistory] = useState<PaymentMonthStats[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      const d = await loadSharedExpenseData(grantorUserId);
      if (cancelled) return;
      if (!d) {
        setErr("You don’t have access to this shared view, or the link is invalid.");
        setData(null);
        setLoading(false);
        return;
      }
      setData(d);
      const h = await getPaymentHistoryMonthsForGrantor(grantorUserId, 6);
      if (!cancelled && h.stats) setHistory(h.stats);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [grantorUserId]);

  const orderedCategoryIds = useMemo(() => {
    if (categoriesFromDb.length > 0) {
      return [...categoriesFromDb].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.id);
    }
    return [];
  }, [categoriesFromDb]);

  const getLabel = (id: string) => categoriesFromDb.find((c) => c.id === id)?.label ?? id;

  const { map: grouped } = useMemo(() => {
    const ids = orderedCategoryIds.length ? orderedCategoryIds : [...new Set(data?.entries.map((e) => e.category_id) ?? [])];
    return groupByCategory(data?.entries ?? [], ids);
  }, [data?.entries, orderedCategoryIds]);

  if (loading) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (err || !data) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <p className="text-destructive">{err ?? "Could not load shared My Expenses."}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/shared">Back</Link>
        </Button>
      </div>
    );
  }

  const totalExpenses = data.entries.reduce((s, e) => s + e.amount, 0);
  const totalPaid = data.entries.reduce((s, e) => s + (data.paidEntryIds.includes(e.id) ? e.amount : 0), 0);
  const unpaid = Math.max(0, totalExpenses - totalPaid);
  const paidPct = totalExpenses > 0 ? Math.min(100, Math.round((totalPaid / totalExpenses) * 100)) : 0;
  const paidCount = data.entries.filter((e) => data.paidEntryIds.includes(e.id)).length;

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary">Read-only · partner&apos;s My Expenses</Badge>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/shared/${grantorUserId}`}>Hub</Link>
        </Button>
      </div>

      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 p-6 text-primary-foreground shadow-lg dark:from-primary/80 dark:to-primary/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium opacity-90">
              <CalendarRange className="h-4 w-4" />
              This month ({data.paidMonth})
            </p>
            <p className="mt-1 text-sm opacity-80">Still to pay</p>
            <p className="text-4xl font-bold tracking-tight sm:text-5xl">{formatCurrency(unpaid)}</p>
            <p className="mt-2 text-xs opacity-90">
              {paidCount} of {data.entries.length} marked paid · {paidPct}% of amount
            </p>
          </div>
          {totalExpenses > 0 && (
            <div
              className="relative mx-auto h-28 w-28 shrink-0 rounded-full sm:mx-0"
              style={{
                background: `conic-gradient(rgb(34 197 94) 0% ${paidPct}%, rgba(255,255,255,0.25) ${paidPct}% 100%)`,
              }}
              aria-hidden
            >
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-primary text-center text-[10px] font-medium leading-tight text-primary-foreground">
                <span className="opacity-80">Paid</span>
                <span className="text-lg font-bold">{paidPct}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Bills</p>
          <p className="text-lg font-bold">{data.entries.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Total out</p>
          <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Paid this month</p>
          <p className="text-lg font-bold">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Unpaid</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCurrency(unpaid)}</p>
        </div>
      </div>

      {history.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment completion by month</CardTitle>
            <CardDescription>Share of bills marked paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end justify-between gap-1 sm:gap-2">
              {history.map((row) => {
                const pct = row.totalCount > 0 ? Math.round((row.paidCount / row.totalCount) * 100) : 0;
                const barPx = Math.max(6, Math.round((pct / 100) * 96));
                return (
                  <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full max-w-[3rem] items-end justify-center">
                      <div
                        className="w-full max-w-10 rounded-t-md bg-primary/80 transition-all"
                        style={{ height: `${barPx}px` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{row.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 text-lg font-semibold">Expenses by category</h2>
      <div className="space-y-3">
        {Array.from(grouped.entries())
          .sort((a, b) => {
            const ai = orderedCategoryIds.indexOf(a[0]);
            const bi = orderedCategoryIds.indexOf(b[0]);
            if (ai >= 0 && bi >= 0) return ai - bi;
            if (ai >= 0) return -1;
            if (bi >= 0) return 1;
            return a[0].localeCompare(b[0]);
          })
          .map(([catId, list]) => {
            const catTotal = list.reduce((s, e) => s + e.amount, 0);
            const catPct = totalExpenses > 0 ? Math.min(100, Math.round((catTotal / totalExpenses) * 100)) : 0;
            return (
              <Card key={catId}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between gap-2">
                    <CardTitle className="text-base">{getLabel(catId)}</CardTitle>
                    <span className="text-lg font-bold tabular-nums">{formatCurrency(catTotal)}</span>
                  </div>
                  {totalExpenses > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${catPct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{catPct}%</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {list.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <span className={cn(data.paidEntryIds.includes(e.id) && "text-muted-foreground line-through")}>
                          {e.note || getLabel(e.category_id)}
                        </span>
                        <span className={cn("font-semibold tabular-nums", data.paidEntryIds.includes(e.id) && "text-muted-foreground line-through")}>
                          {formatCurrency(e.amount)}
                        </span>
                        {e.due_date && (
                          <span className="w-full text-xs text-muted-foreground">
                            Due {new Date(e.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {data.paidEntryIds.includes(e.id) && (
                          <Badge variant="outline" className="text-emerald-700">
                            Paid
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
