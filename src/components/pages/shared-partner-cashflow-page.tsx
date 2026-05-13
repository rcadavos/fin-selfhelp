"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentHeader } from "@/components/app/content-header";
import { loadSharedExpenseData, type ExpenseEntryRow } from "@/actions/budget";
import { granteeSharedToggleExpensePayment } from "@/actions/expense-payments";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { formatCurrency, cn } from "@/lib/utils";
import { CheckCircle2, CircleDollarSign, LayoutDashboard, Loader2 } from "lucide-react";

function groupEntriesByCategory(entries: ExpenseEntryRow[]) {
  const map = new Map<string, ExpenseEntryRow[]>();
  for (const entry of entries) {
    const list = map.get(entry.category_id) ?? [];
    list.push(entry);
    map.set(entry.category_id, list);
  }
  return map;
}

function getCategoryLabel(categories: { id: string; label: string }[], id: string): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}

function getCategoryBg(categories: { id: string; bgClass: string }[], id: string): string {
  return categories.find((c) => c.id === id)?.bgClass ?? "";
}

type SharedPartnerCashflowPageProps = {
  params: Promise<{ grantorUserId: string }>;
};

export function SharedPartnerCashflowPage({ params }: SharedPartnerCashflowPageProps) {
  const { grantorUserId } = use(params);
  const { data: categoriesFromDb = [] } = useQuery(categoriesQueryOptions());
  const [data, setData] = useState<Awaited<ReturnType<typeof loadSharedExpenseData>>>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);

  const categoriesList = categoriesFromDb;

  const orderedCategoryIds = useMemo(() => {
    if (categoriesFromDb.length > 0) {
      return [...categoriesFromDb].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.id);
    }
    return [];
  }, [categoriesFromDb]);

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
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [grantorUserId]);

  const onTogglePaid = useCallback(
    async (entryId: string) => {
      if (!data) return;
      setActionError(null);
      setSavingEntryId(entryId);
      const res = await granteeSharedToggleExpensePayment(grantorUserId, entryId, data.paidMonth);
      setSavingEntryId(null);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        const ids = new Set(prev.paidEntryIds);
        if (res.paid) ids.add(entryId);
        else ids.delete(entryId);
        return { ...prev, paidEntryIds: [...ids] };
      });
    },
    [data, grantorUserId]
  );

  const grouped = useMemo(() => groupEntriesByCategory(data?.entries ?? []), [data?.entries]);

  if (loading) {
    return (
      <main className="app-main-centered">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (err || !data) {
    return (
      <div className="w-full py-2">
        <p className="text-destructive">{err ?? "Could not load shared My Expenses."}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/account/shared">Back</Link>
        </Button>
      </div>
    );
  }

  const entries = data.entries;
  const paidIds = new Set(data.paidEntryIds);
  const totalExpenses = entries.reduce((s, e) => s + e.amount, 0);
  const totalPaidThisMonth = entries.reduce((s, e) => s + (paidIds.has(e.id) ? e.amount : 0), 0);
  const unpaidThisMonth = Math.max(0, totalExpenses - totalPaidThisMonth);
  const paidCount = entries.filter((e) => paidIds.has(e.id)).length;
  const paidPct = totalExpenses > 0 ? Math.min(100, Math.round((totalPaidThisMonth / totalExpenses) * 100)) : 0;
  const paidCountPct = entries.length > 0 ? Math.round((paidCount / entries.length) * 100) : 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8">
      <ContentHeader
        title="My Expenses"
        subtitle={`Shared view — you can mark bills paid for ${data.paidMonth}. Amounts and line items are read-only.`}
        className="mb-4 mt-4"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/account/shared/${grantorUserId}`} className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Hub
            </Link>
          </Button>
        }
      />

      {actionError ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Expenses by category</h2>
          {entries.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {entries.length} item{entries.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <CircleDollarSign className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-muted-foreground">No expenses in this list.</p>
            </CardContent>
          </Card>
        ) : (
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
              .map(([categoryId, categoryEntries]) => {
                const total = categoryEntries.reduce((s, e) => s + e.amount, 0);
                const catPct = totalExpenses > 0 ? Math.min(100, Math.round((total / totalExpenses) * 100)) : 0;
                return (
                  <Card
                    key={categoryId}
                    className={cn("overflow-hidden", getCategoryBg(categoriesList, categoryId))}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{getCategoryLabel(categoriesList, categoryId)}</CardTitle>
                          <span className="text-xs text-muted-foreground">
                            {categoryEntries.length} item{categoryEntries.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="text-lg font-bold tabular-nums">{formatCurrency(total)}</span>
                      </div>
                      {totalExpenses > 0 && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                catPct > 40 ? "bg-amber-500" : "bg-primary/60"
                              )}
                              style={{ width: `${catPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{catPct}%</span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ul className="divide-y divide-border/50">
                        {categoryEntries.map((entry) => {
                          const isPaid = paidIds.has(entry.id);
                          const busy = savingEntryId === entry.id;
                          return (
                            <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span
                                    className={cn(
                                      "text-sm font-medium",
                                      isPaid && "line-through text-muted-foreground/60"
                                    )}
                                  >
                                    {entry.note ? entry.note : getCategoryLabel(categoriesList, entry.category_id)}
                                  </span>
                                  <span
                                    className={cn(
                                      "shrink-0 text-sm font-bold tabular-nums",
                                      isPaid && "line-through text-muted-foreground/60"
                                    )}
                                  >
                                    {formatCurrency(entry.amount)}
                                  </span>
                                  {isPaid ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 shrink-0 gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60"
                                      onClick={() => void onTogglePaid(entry.id)}
                                      disabled={busy}
                                      title="Mark unpaid"
                                    >
                                      {busy ? (
                                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                      ) : (
                                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                                      )}
                                      {busy ? "…" : "Paid"}
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      className="h-7 shrink-0"
                                      onClick={() => void onTogglePaid(entry.id)}
                                      disabled={busy}
                                      title="Mark paid this month"
                                    >
                                      {busy ? (
                                        <>
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
                                          …
                                        </>
                                      ) : (
                                        "Mark Paid"
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-emerald-400 to-blue-500" />
        <CardHeader>
          <CardTitle className="text-base">Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Month</span>
            <span className="font-medium tabular-nums">{data.paidMonth}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total expenses</span>
            <span className="font-bold tabular-nums">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bills paid this month</span>
            <span className={cn("font-bold tabular-nums", totalPaidThisMonth > 0 ? "text-emerald-600" : "")}>
              {formatCurrency(totalPaidThisMonth)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Still unpaid</span>
            <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {formatCurrency(unpaidThisMonth)}
            </span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between text-base font-semibold">
              <span>Bills marked paid</span>
              <span className="tabular-nums">
                {paidCount} / {entries.length}
              </span>
            </div>
            {totalExpenses > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {paidPct}% of amount • {paidCountPct}% of bills
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
