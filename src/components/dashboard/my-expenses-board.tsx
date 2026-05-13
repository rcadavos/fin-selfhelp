"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Banknote,
  Car,
  Download,
  LayoutGrid,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addExpense, deleteExpense, type ExpenseEntryRow } from "@/actions/budget";
import { type AccountRow } from "@/actions/accounts";
import { useUser } from "@/hooks/use-user";
import { expenseDataQueryOptions } from "@/lib/query/expenses";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { accountsQueryOptions } from "@/lib/query/accounts";
import {
  vehiclesQueryOptions,
  buildVehicleColorMap,
  invalidateVehicleQueriesIfTransportAffected,
} from "@/lib/query/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { formatCurrency } from "@/lib/utils";
import { TAILWIND_DOT_COLORS } from "@/lib/constants/tailwind-dot-colors";
import { ContentHeader } from "../app/content-header";
import { AddExpenseDialog } from "@/components/dashboard/expense/add-expense-dialog";
import { EditExpenseDialog } from "@/components/dashboard/expense/edit-expense-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { SpendingByCategoryCollapsibleCard } from "@/components/dashboard/spending-by-category-collapsible-card";

// ─── Constants ────────────────────────────────────────────────────────────────

function colorFromBgClass(bgClass: string): string {
  const m = bgClass.match(/bg-([a-z]+)-/);
  return (m && TAILWIND_DOT_COLORS[m[1]]) ?? "#9ca3af";
}

function getCategoryColor(id: string, categories: CatList): string {
  const cat = categories.find((c) => c.id === id);
  return cat?.bgClass ? colorFromBgClass(cat.bgClass) : "#9ca3af";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CatList = Array<{ id: string; label: string; bgClass: string }>;

function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

function getCategoryLabel(id: string, categories: CatList): string {
  if (!id) return "Uncategorized";
  return categories.find((c) => c.id === id)?.label ?? "Uncategorized";
}

function getEntryName(entry: ExpenseEntryRow, categories: CatList): string {
  return (
    entry.note?.trim() ||
    entry.notes?.trim() ||
    getCategoryLabel(entry.category_id, categories)
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportBoardToCSV(expenses: ExpenseEntryRow[], categories: CatList): void {
  const headers = ["Name", "Category", "Amount", "Date"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = expenses.map((e) => {
    const name = e.note?.trim() || e.notes?.trim() || getCategoryLabel(e.category_id, categories);
    const date = e.created_at ? e.created_at.slice(0, 10) : "";
    return [esc(name), esc(getCategoryLabel(e.category_id, categories)), e.amount, date].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
    download: `expenses-${new Date().toISOString().slice(0, 10)}.csv`,
    style: "display:none",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportBoardToExcel(expenses: ExpenseEntryRow[], categories: CatList): void {
  const headers = ["Name", "Category", "Amount", "Date"];
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headerRow = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const dataRows = expenses.map((e) => {
    const name = e.note?.trim() || e.notes?.trim() || getCategoryLabel(e.category_id, categories);
    const date = e.created_at ? e.created_at.slice(0, 10) : "";
    return `<tr>${[name, getCategoryLabel(e.category_id, categories), e.amount, date].map((v) => `<td>${esc(String(v))}</td>`).join("")}</tr>`;
  }).join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table><tr>${headerRow}</tr>${dataRows}</table></body></html>`;
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })),
    download: `expenses-${new Date().toISOString().slice(0, 10)}.xls`,
    style: "display:none",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatGroupDate(dateStr: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Expense Pie Chart ────────────────────────────────────────────────────────

function PiePercentLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; percent?: number;
}) {
  if (percent === undefined || percent < 0.05) return null;
  if (cx === undefined || cy === undefined || midAngle === undefined || innerRadius === undefined || outerRadius === undefined) return null;

  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function ExpensePieChart({ entries, categories }: { entries: ExpenseEntryRow[]; categories: CatList }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.category_id, (map.get(e.category_id) ?? 0) + e.amount);
    return Array.from(map.entries())
      .map(([id, value]) => ({
        name: getCategoryLabel(id, categories),
        value,
        color: getCategoryColor(id, categories),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [entries, categories]);

  if (!data.length) return null;

  return (
    <div className="[&_svg]:outline-none">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart style={{ outline: "none" }}>
          <Pie
            style={{ outline: "none" }}
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={55}
            paddingAngle={2}
            labelLine={false}
            label={PiePercentLabel}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} style={{ outline: "none" }} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const total = data.reduce((s, d) => s + d.value, 0);
              const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(0) : 0;
              return [`${pct}% : ${formatCurrency(Number(value ?? 0))}`, ""];
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ right: 10 }}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function MyExpensesBoard() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentPaidMonth());

  const monthOptions = useMemo(() => {
    const now = new Date();
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 13; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      opts.push({
        value: ym,
        label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }
    return opts;
  }, []);

  const expenseDataQuery = useQuery(expenseDataQueryOptions(selectedMonth));
  const { data: dbCategories } = useSuspenseQuery(categoriesQueryOptions());
  const accountsQuery = useQuery(accountsQueryOptions());
  const vehiclesQuery = useQuery(vehiclesQueryOptions());
  const accounts = accountsQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])) as Record<string, AccountRow>,
    [accounts]
  );
  const vehicleMap = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, v])),
    [vehicles]
  );
  const vehicleColorMap = useMemo(() => buildVehicleColorMap(vehicles), [vehicles]);
  const categories = dbCategories;
  const paidMonth = selectedMonth;
  const allEntries: ExpenseEntryRow[] = expenseDataQuery.data?.entries ?? [];

  const expenses = useMemo(
    () =>
      allEntries
        .filter((e) => e.created_at?.slice(0, 7) === selectedMonth)
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }),
    [allEntries, selectedMonth]
  );

  const expenseGroups = useMemo(() => {
    const groups: Array<{ date: string; entries: ExpenseEntryRow[] }> = [];
    for (const exp of expenses) {
      const date = exp.created_at ? exp.created_at.slice(0, 10) : "unknown";
      const last = groups[groups.length - 1];
      if (last && last.date === date) {
        last.entries.push(exp);
      } else {
        groups.push({ date, entries: [exp] });
      }
    }
    return groups;
  }, [expenses]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const expensesToday = useMemo(() => {
    const todayTime = startOfTodayLocal().getTime();
    return allEntries.filter((e) => {
      if (!e.created_at) return false;
      const d = new Date(e.created_at);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() === todayTime;
    });
  }, [allEntries]);

  const totalToday = useMemo(() => expensesToday.reduce((s, e) => s + e.amount, 0), [expensesToday]);

  // ── Quick-add expense state ──
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expDate, setExpDate] = useState(todayYmd);
  const [expSaving, setExpSaving] = useState(false);
  const expNameRef = useRef<HTMLInputElement>(null);

  // ── Error banner ──
  const [error, setError] = useState<string | null>(null);

  /** Mobile: chart body starts collapsed; tap the card header to expand. Desktop always shows the chart. */
  const [showMobileCategoryChart, setShowMobileCategoryChart] = useState(false);

  // ── Add dialog state ──
  const [addOpen, setAddOpen] = useState(false);

  // ── Edit modal state ──
  const [editingEntry, setEditingEntry] = useState<ExpenseEntryRow | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return selectedMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, [selectedMonth]);

  // Reset quick-add date when month changes
  useEffect(() => {
    const defaultDate = isCurrentMonth ? todayYmd() : `${selectedMonth}-01`;
    setExpDate(defaultDate);
  }, [selectedMonth, isCurrentMonth]);

  // Auth guard
  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenseData(paidMonth) });
  }, [queryClient, paidMonth]);

  // ── Handlers ──

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const name = expName.trim();
    const amt = parseFloat(expAmount);
    if (!name || isNaN(amt) || amt <= 0) {
      setError("Please enter a name and an amount greater than 0.");
      return;
    }

    const queryKey = queryKeys.expenseData(paidMonth);
    const snapshot = queryClient.getQueryData(queryKey);

    const optimisticEntry: ExpenseEntryRow = {
      id: `optimistic-${Date.now()}`,
      category_id: expCategory || "",
      amount: amt,
      note: name,
      notes: null,
      created_at: `${expDate}T00:00:00`,
    };
    queryClient.setQueryData<import("@/actions/budget").ExpenseData | null>(queryKey, (old) =>
      old ? { ...old, entries: [...old.entries, optimisticEntry] } : old
    );

    const savedName = expName;
    const savedAmount = expAmount;
    const savedCategory = expCategory;
    const savedDate = expDate;
    setExpName("");
    setExpAmount("");
    setExpCategory("");
    setExpDate(todayYmd());
    setError(null);
    setExpSaving(true);

    const res = await addExpense(
      savedCategory || "other",
      amt,
      savedName,
      null,
      savedDate,
    );
    setExpSaving(false);
    if (res.error) {
      setError(res.error);
      queryClient.setQueryData(queryKey, snapshot);
      setExpName(savedName);
      setExpAmount(savedAmount);
      setExpCategory(savedCategory);
      setExpDate(savedDate);
    } else {
      invalidate();
      invalidateVehicleQueriesIfTransportAffected(queryClient, savedCategory || "other");
      expNameRef.current?.focus();
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id);
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    startTransition(async () => {
      const entry = allEntries.find((e) => e.id === deletingId);
      const res = await deleteExpense(deletingId);
      setDeletingId(null);
      if (res.error) setError(res.error);
      else {
        invalidate();
        invalidateVehicleQueriesIfTransportAffected(queryClient, entry?.category_id);
      }
    });
  }

  function handleOpenEdit(entry: ExpenseEntryRow) {
    setEditingEntry(entry);
  }

  // ── Render ──
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      {/* Header */}
      <ContentHeader
        title="Expenses"
        subtitle="Track your one-off expenses and spending by category."
        icon={Banknote}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" aria-label="Categories" asChild>
              <Link href="/dashboard/expenses/categories">
                <LayoutGrid className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Categories</span>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportBoardToCSV(expenses, categories)}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBoardToExcel(expenses, categories)}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Summary: stats (1/3) + pie chart (2/3) */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Stat cards */}
        <div className="flex flex-row gap-3 sm:w-1/3 sm:flex-col">
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Expenses - Today</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              <AnimatedAmount value={totalToday} />
            </p>
            <p className="text-[11px] text-muted-foreground">{expensesToday.length} item{expensesToday.length !== 1 ? "s" : ""} today</p>
          </div>
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Expenses - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              <AnimatedAmount value={totalExpenses} />
            </p>
            <p className="text-[11px] text-muted-foreground">{expenses.length} item{expenses.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Pie chart (mobile: tap section header to expand; desktop: always visible) */}
        <div className="sm:w-2/3">
          {expenseDataQuery.isPending ? (
            <SpendingByCategoryCollapsibleCard
              expanded={showMobileCategoryChart}
              onToggle={() => setShowMobileCategoryChart((v) => !v)}
              panelId="expenses-spending-by-category-body"
            >
              <Skeleton className="h-[150px] w-full" />
            </SpendingByCategoryCollapsibleCard>
          ) : expenses.length > 0 ? (
            <SpendingByCategoryCollapsibleCard
              expanded={showMobileCategoryChart}
              onToggle={() => setShowMobileCategoryChart((v) => !v)}
              panelId="expenses-spending-by-category-body"
            >
              <ExpensePieChart entries={expenses} categories={categories} />
            </SpendingByCategoryCollapsibleCard>
          ) : (
            <SpendingByCategoryCollapsibleCard
              expanded={showMobileCategoryChart}
              onToggle={() => setShowMobileCategoryChart((v) => !v)}
              dashed
              panelId="expenses-spending-by-category-body"
            >
              <div className="flex min-h-[150px] items-center justify-center text-sm text-muted-foreground">
                Add an expense to see the chart
              </div>
            </SpendingByCategoryCollapsibleCard>
          )}
        </div>
      </div>

      {/* Month selector + Add Expense button */}
      <div className="flex items-center justify-between my-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-10 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm font-medium shadow-none hover:bg-muted focus:ring-0 [&>svg]:opacity-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="lg" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden />
          Add Expense
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Expenses board */}
      <div className="flex flex-col gap-2">
        {expenseDataQuery.isPending ? (
          <DashboardSkeleton variant="form" />
        ) : expenses.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No expenses yet. Add one to get started.
          </p>
        ) : (
          expenseGroups.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-2 pb-1.5 pt-3 first:pt-0">
                <span className="text-xs font-semibold text-muted-foreground">{formatGroupDate(group.date)}</span>
                <div className="flex-1 border-t" />
              </div>
              <div className="flex flex-col gap-2">
                {group.entries.map((exp) => {
                  const isPending = exp.id.startsWith("optimistic-");
                  return (
                    <div
                      key={exp.id}
                      onClick={() => { if (!isPending) handleOpenEdit(exp); }}
                      className={`flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-shadow ${isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md hover:border-primary/30"}`}
                    >
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: getCategoryColor(exp.category_id, categories) }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">{getEntryName(exp, categories)}</p>
                          {exp.vehicle_id && vehicleMap[exp.vehicle_id] && (() => {
                            const color = vehicleColorMap[exp.vehicle_id!] ?? "#6b7280";
                            return (
                              <span
                                className="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
                              >
                                <Car className="h-2.5 w-2.5" />
                                {vehicleMap[exp.vehicle_id!].name}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {getCategoryLabel(exp.category_id, categories)}
                        </p>
                      </div>
                      {exp.account_id && accountMap[exp.account_id] && (
                        <span
                          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${accountMap[exp.account_id].color}22`,
                            color: accountMap[exp.account_id].color,
                          }}
                        >
                          {accountMap[exp.account_id].account_alias}
                        </span>
                      )}
                      <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(exp.amount)}
                      </span>
                      <button
                        disabled={isPending}
                        onClick={(e) => { e.stopPropagation(); if (!isPending) handleDelete(exp.id); }}
                        className="flex-shrink-0 rounded-full p-1 text-muted-foreground/40 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400 disabled:pointer-events-none disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

      </div>

      <AddExpenseDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EditExpenseDialog entry={editingEntry} onClose={() => setEditingEntry(null)} onDelete={handleDelete} />

      {/* Delete confirm */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete expense?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the expense.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="w-1/2" onClick={() => setDeletingId(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" className="w-1/2" onClick={handleDeleteConfirm} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
