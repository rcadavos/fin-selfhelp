"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Download,
  LayoutGrid,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addExpense, deleteExpense, updateExpense, type ExpenseEntryRow } from "@/actions/budget";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import { useUser } from "@/hooks/use-user";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import { expenseDataQueryOptions } from "@/lib/query/expenses";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { formatCurrency, cn } from "@/lib/utils";
import Image from "next/image";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAILWIND_DOT_COLORS: Record<string, string> = {
  amber: "#f59e0b",
  sky: "#0ea5e9",
  slate: "#64748b",
  emerald: "#10b981",
  rose: "#f43f5e",
  green: "#22c55e",
  violet: "#8b5cf6",
  orange: "#f97316",
  teal: "#14b8a6",
  indigo: "#6366f1",
  pink: "#ec4899",
  cyan: "#06b6d4",
  fuchsia: "#d946ef",
  lime: "#84cc16",
  blue: "#3b82f6",
  neutral: "#9ca3af",
  red: "#ef4444",
  yellow: "#eab308",
  purple: "#a855f7",
};

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

function formatShortDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function getExpenseDateLabel(entry: ExpenseEntryRow): string {
  if (!entry.created_at) return "";
  return formatShortDate(entry.created_at);
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
      <ResponsiveContainer width="100%" height={200}>
        <PieChart style={{ outline: "none" }}>
          <Pie
            style={{ outline: "none" }}
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            labelLine={false}
            label={PiePercentLabel}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} style={{ outline: "none" }} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value ?? 0)), ""]}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend
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

  const { data: expenseData, isLoading } = useQuery(expenseDataQueryOptions());
  const { data: dbCategories = [] } = useQuery(categoriesQueryOptions());
  const { data: capabilities } = useQuery(subscriptionCapabilitiesQueryOptions());
  const categories = useMemo(
    () => (dbCategories.length > 0 ? dbCategories : EXPENSE_CATEGORIES),
    [dbCategories]
  );
  const paidMonth = expenseData?.paidMonth ?? getCurrentPaidMonth();
  const allEntries: ExpenseEntryRow[] = expenseData?.entries ?? [];

  const expenses = useMemo(
    () =>
      allEntries
        .filter((e) => !e.due_date)
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }),
    [allEntries]
  );

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const expensesToday = useMemo(() => {
    const todayTime = startOfTodayLocal().getTime();
    return allEntries.filter((e) => {
      if (e.due_date) return false;
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

  // ── Edit modal state ──
  const [editingEntry, setEditingEntry] = useState<ExpenseEntryRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editNote, setEditNote] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
      billing_period: "monthly",
      note: name,
      notes: null,
      due_date: null,
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
      savedCategory || "other", amt, savedName,
      null, null, null, "monthly", "both", savedDate
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
      expNameRef.current?.focus();
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await deleteExpense(id);
    if (res.error) setError(res.error);
    else invalidate();
  }

  function handleOpenEdit(entry: ExpenseEntryRow) {
    setEditingEntry(entry);
    setEditName(entry.note?.trim() || "");
    setEditAmount(String(entry.amount));
    setEditCategory(entry.category_id);
    setEditNote(entry.notes?.trim() || "");
    setEditExpenseDate(entry.created_at ? entry.created_at.slice(0, 10) : todayYmd());
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;
    const name = editName.trim();
    const amt = parseFloat(editAmount);
    if (!name || isNaN(amt) || amt <= 0) {
      setEditError("Please enter a name and a valid amount.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    const res = await updateExpense(
      editingEntry.id,
      editCategory,
      amt,
      name,
      editNote.trim() || null,
      undefined,
      null,
      undefined,
      undefined,
      editExpenseDate
    );
    setEditSaving(false);
    if (res.error) {
      setEditError(res.error);
    } else {
      setEditingEntry(null);
      invalidate();
    }
  }

  if (userLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Image src="/favicon.png" alt="" aria-hidden className="h-20 w-20 animate-breathing" width={80} height={80} />
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Banknote className="h-6 w-6 text-primary" />
            Expenses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your one-off expenses and spending by category.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" aria-label="View Categories" asChild>
            <Link href="/dashboard/expenses/categories">
              <LayoutGrid className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">View Categories</span>
            </Link>
          </Button>
          {expenses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Export expenses">
                  <Download className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportBoardToCSV(expenses, categories)}>
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBoardToExcel(expenses, categories)}>
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Summary: stats (1/3) + pie chart (2/3) */}
      <div className="mb-4 flex gap-3">
        {/* Stat cards */}
        <div className="flex w-1/3 flex-col gap-3">
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Expenses - Today</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalToday)}</p>
            <p className="text-[11px] text-muted-foreground">{expensesToday.length} item{expensesToday.length !== 1 ? "s" : ""} today</p>
          </div>
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Expenses - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(totalExpenses)}</p>
            <p className="text-[11px] text-muted-foreground">{expenses.length} item{expenses.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Pie chart */}
        <div className="w-2/3">
          {expenses.length > 0 ? (
            <Card className="h-full">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Spending by category
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-3">
                <ExpensePieChart entries={expenses} categories={categories} />
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              Add an expense to see the chart
            </div>
          )}
        </div>
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
      <div className="flex flex-col gap-4">
        {/* Quick-add form */}
        <form
          onSubmit={handleAddExpense}
          className="rounded-xl border bg-card px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/30"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-2">
              <div className="flex items-center gap-2 lg:contents">
                <input
                  ref={expNameRef}
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  placeholder="Expense name"
                  className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                  disabled={expSaving}
                />
                <input
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="0"
                  type="number"
                  min="0.01"
                  step="any"
                  className="h-7 w-20 flex-shrink-0 rounded-md border border-input bg-transparent px-2 text-right text-sm placeholder:text-muted-foreground tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  disabled={expSaving}
                />
              </div>
              <div className="flex items-center gap-2 lg:contents">
                <Select value={expCategory} onValueChange={setExpCategory}>
                  <SelectTrigger className="h-7 min-w-0 flex-1 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DatePicker
                  value={expDate}
                  onChange={setExpDate}
                  disabled={expSaving}
                  formatDisplay={formatShortDate}
                  triggerClassName="h-7 w-auto flex-shrink-0 gap-1 px-2 text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={expSaving || !expName.trim() || !expAmount}
              className="flex-shrink-0 self-stretch rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
            >
              {expSaving ? "…" : "Add"}
            </button>
          </div>
        </form>

        {/* Expenses list */}
        <div className="flex flex-col gap-2">
          {expenses.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No expenses yet — type above and press Enter or click Add.
            </p>
          ) : (
            expenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleOpenEdit(exp)}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/30"
              >
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: getCategoryColor(exp.category_id, categories) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{getEntryName(exp, categories)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {getCategoryLabel(exp.category_id, categories)}
                    {getExpenseDateLabel(exp) && (
                      <span className="text-muted-foreground/60"> · {getExpenseDateLabel(exp)}</span>
                    )}
                  </p>
                </div>
                <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(exp.amount)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                  className="flex-shrink-0 rounded-full p-1 text-muted-foreground/40 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Edit modal ── */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="grid gap-4 py-2">
            {/* Row 1: Name + Amount */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  min="0.01"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="₱0"
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Row 2: Category + Date */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-date">Date</Label>
                <DatePicker
                  id="edit-date"
                  value={editExpenseDate}
                  onChange={setEditExpenseDate}
                  formatDisplay={formatShortDate}
                />
              </div>
            </div>

            {/* Note */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-note">Note</Label>
              <textarea
                id="edit-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note…"
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {editError && <p className="text-sm text-destructive">{editError}</p>}

            <DialogFooter className="pt-2">
              <div className="flex w-full items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 rounded-full text-destructive hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Remove"
                  onClick={() => { handleDelete(editingEntry!.id); setEditingEntry(null); }}
                  disabled={editSaving}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
                <div className="flex flex-1 gap-2">
                  <Button type="button" variant="outline" className="w-1/2" onClick={() => setEditingEntry(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-1/2"
                    disabled={editSaving || !editName.trim() || !editAmount}
                  >
                    {editSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
