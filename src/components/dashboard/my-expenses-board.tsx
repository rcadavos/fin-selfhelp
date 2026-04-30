"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  CalendarDays,
  Car,
  Download,
  LayoutGrid,
  Plus,
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
import { DatePicker, parseYmdToLocalDate } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatYmdLocal } from "@/lib/expense-due-date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addExpense, deleteExpense, updateExpense, type ExpenseEntryRow } from "@/actions/budget";
import { type AccountRow } from "@/actions/accounts";
import { useUser } from "@/hooks/use-user";
import { expenseDataQueryOptions } from "@/lib/query/expenses";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { accountsQueryOptions } from "@/lib/query/accounts";
import { vehiclesQueryOptions, buildVehicleColorMap } from "@/lib/query/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { formatCurrency, cn } from "@/lib/utils";
import { TAILWIND_DOT_COLORS } from "@/lib/constants/tailwind-dot-colors";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { ContentHeader } from "../app/content-header";

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

// ─── Account Tag Selector ─────────────────────────────────────────────────────

const LAST_ACCOUNT_NAMES = ["cash", "borrowed"];

function AccountTagSelector({
  accounts,
  value,
  onChange,
}: {
  accounts: AccountRow[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (!accounts.length) return null;
  const sorted = [...accounts].sort((a, b) => {
    const aLast = LAST_ACCOUNT_NAMES.includes(a.account_alias.toLowerCase()) ? 1 : 0;
    const bLast = LAST_ACCOUNT_NAMES.includes(b.account_alias.toLowerCase()) ? 1 : 0;
    return aLast - bLast;
  });
  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((acc) => {
        const selected = value === acc.id;
        return (
          <button
            key={acc.id}
            type="button"
            onClick={() => onChange(selected ? "" : acc.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              selected
                ? "ring-1"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
            style={selected ? {
              backgroundColor: `${acc.color}22`,
              color: acc.color,
              outlineColor: acc.color,
            } : undefined}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: acc.color }} />
            {acc.account_alias}
          </button>
        );
      })}
    </div>
  );
}

// ─── Inline Date Picker (icon-only) ──────────────────────────────────────────

function InlineDatePicker({
  value,
  onChange,
  disabled,
  restrictToMonth,
}: {
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  restrictToMonth?: string; // YYYY-MM — locks calendar nav to this month
}) {
  const [open, setOpen] = useState(false);
  const selected = value.trim() ? parseYmdToLocalDate(value) : undefined;
  const monthDate = useMemo(() => {
    if (!restrictToMonth) return undefined;
    const [y, m] = restrictToMonth.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [restrictToMonth]);
  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted",
            value ? "text-primary" : "text-muted-foreground/50"
          )}
          aria-label={value ? `Date: ${value}` : "Pick date"}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[100] w-auto border-0 bg-transparent p-0 shadow-none" align="end">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={monthDate ?? selected ?? new Date()}
          startMonth={monthDate}
          endMonth={monthDate}
          onSelect={(d) => {
            if (!d) return;
            onChange(formatYmdLocal(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
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

  const { data: expenseData, isLoading } = useQuery({
    ...expenseDataQueryOptions(selectedMonth),
    enabled: !!user && !userLoading,
  });
  const { data: dbCategories = [] } = useQuery(categoriesQueryOptions());
  const { data: accounts = [] } = useQuery(accountsQueryOptions());
  const { data: vehicles = [] } = useQuery({ ...vehiclesQueryOptions(), enabled: !!user });
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
  const allEntries: ExpenseEntryRow[] = expenseData?.entries ?? [];

  const expenses = useMemo(
    () =>
      allEntries
        .filter((e) => !e.due_date && e.created_at?.slice(0, 7) === selectedMonth)
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }),
    [allEntries, selectedMonth]
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

  // ── Add dialog state ──
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addDate, setAddDate] = useState(todayYmd);
  const [addAccountId, setAddAccountId] = useState("");
  const [addVehicleId, setAddVehicleId] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Edit modal state ──
  const [editingEntry, setEditingEntry] = useState<ExpenseEntryRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editVehicleId, setEditVehicleId] = useState("");

  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    setAddDate(defaultDate);
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

  function handleDelete(id: string) {
    setDeletingId(id);
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    startTransition(async () => {
      const res = await deleteExpense(deletingId);
      setDeletingId(null);
      if (res.error) setError(res.error);
      else invalidate();
    });
  }

  function handleOpenEdit(entry: ExpenseEntryRow) {
    setEditingEntry(entry);
    setEditName(entry.note?.trim() || "");
    setEditAmount(String(entry.amount));
    setEditCategory(entry.category_id === "other" || !entry.category_id ? "" : entry.category_id);
    setEditNote(entry.notes?.trim() || "");
    setEditExpenseDate(entry.created_at ? entry.created_at.slice(0, 10) : todayYmd());
    setEditAccountId(entry.account_id ?? "");
    setEditVehicleId(entry.vehicle_id ?? "");
    setEditError(null);
  }

  async function handleAddFromDialog(e: React.FormEvent) {
    e.preventDefault();
    const name = addName.trim();
    const amt = parseFloat(addAmount);
    if (!name || isNaN(amt) || amt <= 0) {
      setAddError("Please enter a name and a valid amount.");
      return;
    }
    setAddSaving(true);
    setAddError(null);
    const res = await addExpense(
      addCategory || "other", amt, name,
      addNote.trim() || null, null, null, "monthly", "both", addDate, addAccountId || null, addVehicleId || null
    );
    setAddSaving(false);
    if (res.error) {
      setAddError(res.error);
    } else {
      setAddOpen(false);
      setAddName("");
      setAddAmount("");
      setAddCategory("");
      setAddNote("");
      setAddDate(todayYmd());
      setAddAccountId("");
      setAddVehicleId("");
      invalidate();
    }
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
      editCategory || "other",
      amt,
      name,
      editNote.trim() || null,
      undefined,
      null,
      undefined,
      undefined,
      editExpenseDate,
      editAccountId || null,
      editVehicleId || null,
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
    return <DashboardSkeleton />;
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
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalToday)}</p>
            <p className="text-[11px] text-muted-foreground">{expensesToday.length} item{expensesToday.length !== 1 ? "s" : ""} today</p>
          </div>
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Expenses - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(totalExpenses)}</p>
            <p className="text-[11px] text-muted-foreground">{expenses.length} item{expenses.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Pie chart */}
        <div className="sm:w-2/3">
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
            <div className="flex h-full min-h-[150px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              Add an expense to see the chart
            </div>
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
        <Button size="lg" onClick={() => { setAddOpen(true); setAddError(null); }} className="gap-1.5">
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

      <form
        onSubmit={handleAddExpense}
        className="flex items-center gap-1.5 sm:gap-3 border border-border/70 py-3 mt-1 mb-2 rounded-lg px-3 sm:px-4"
      >
        <input
          ref={expNameRef}
          value={expName}
          onChange={(e) => setExpName(e.target.value)}
          placeholder="Expense name"
          className="h-9 flex-1 min-w-0 rounded-none border-0 border-b-2 border-muted-foreground/35 bg-transparent px-0 text-base sm:text-sm shadow-none placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-0"
          disabled={expSaving}
          aria-label="Expense name"
        />
        <input
          value={expAmount}
          onChange={(e) => setExpAmount(e.target.value)}
          placeholder="Amount"
          type="number"
          min="0.01"
          step="any"
          className="w-16 sm:w-20 h-9 rounded-none border-0 border-b-2 border-muted-foreground/35 bg-transparent px-0 text-right text-base sm:text-sm tabular-nums shadow-none placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          disabled={expSaving}
          aria-label="Amount"
        />
        <InlineDatePicker value={expDate} onChange={setExpDate} disabled={expSaving} restrictToMonth={selectedMonth} />
        <button
          type="submit"
          disabled={expSaving || !expName.trim() || !expAmount}
          className="flex-shrink-0 rounded-md bg-primary px-2.5 sm:px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {expSaving ? "…" : "Add"}
        </button>
      </form>

      {/* Expenses board */}
      <div className="flex flex-col gap-2">
        {expenses.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No expenses yet — add one above or use the form below.
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
                  {getExpenseDateLabel(exp) && (
                    <span className="text-muted-foreground/60"> • {getExpenseDateLabel(exp)}</span>
                  )}
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

      {/* ── Add modal ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) { setAddOpen(false); setAddError(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddFromDialog} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-amount">Amount</Label>
                <Input
                  id="add-amount"
                  type="number"
                  min="0.01"
                  step="any"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="₱0"
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            {accounts.length > 0 && (
              <div className="grid gap-1.5">
                <AccountTagSelector accounts={accounts} value={addAccountId} onChange={setAddAccountId} />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="add-category">Category</Label>
                <Select value={addCategory} onValueChange={setAddCategory}>
                  <SelectTrigger id="add-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="add-date">Date</Label>
                <DatePicker
                  id="add-date"
                  value={addDate}
                  onChange={setAddDate}
                  formatDisplay={formatShortDate}
                />
              </div>
            </div>

            {/* Vehicle selector — transport category only */}
            {addCategory === "transport" && vehicles.length > 0 && (
              <div className="grid gap-1.5">
                <Label htmlFor="add-vehicle">Vehicle (optional)</Label>
                <Select value={addVehicleId} onValueChange={(v) => setAddVehicleId(v === "_none" ? "" : v)}>
                  <SelectTrigger id="add-vehicle">
                    <SelectValue placeholder="Link to a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None —</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}{v.plate_number ? ` (${v.plate_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="add-note">Note</Label>
              <textarea
                id="add-note"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                placeholder="Optional note…"
                rows={2}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {addError && <p className="text-sm text-destructive">{addError}</p>}

            <DialogFooter className="pt-4">
              <div className="flex w-full gap-2">
                <Button type="button" variant="outline" className="w-1/2" onClick={() => setAddOpen(false)} disabled={addSaving}>
                  Cancel
                </Button>
                <Button type="submit" className="w-1/2" disabled={addSaving || !addName.trim() || !addAmount}>
                  {addSaving ? "Saving…" : "Add"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit modal ── */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            {editingEntry && (
              <p className="text-xs text-muted-foreground">
                {editingEntry.note?.trim() || editingEntry.notes?.trim() || "—"} · {formatCurrency(editingEntry.amount)}
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="grid gap-4">
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

            {accounts.length > 0 && (
              <div className="grid gap-1.5">
                <AccountTagSelector accounts={accounts} value={editAccountId} onChange={setEditAccountId} />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
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

            {/* Vehicle selector — transport category only */}
            {editCategory === "transport" && vehicles.length > 0 && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit-vehicle">Vehicle (optional)</Label>
                <Select value={editVehicleId} onValueChange={(v) => setEditVehicleId(v === "_none" ? "" : v)}>
                  <SelectTrigger id="edit-vehicle">
                    <SelectValue placeholder="Link to a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None —</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}{v.plate_number ? ` (${v.plate_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="edit-note">Note</Label>
              <textarea
                id="edit-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note…"
                rows={2}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {editError && <p className="text-sm text-destructive">{editError}</p>}

            <DialogFooter className="pt-4">
              <div className="flex w-full gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-none rounded-full text-destructive hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Remove"
                  onClick={() => { setEditingEntry(null); handleDelete(editingEntry!.id); }}
                  disabled={editSaving}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
                <Button type="button" variant="outline" className="flex-1 w-1/2" onClick={() => setEditingEntry(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 w-1/2"
                  disabled={editSaving || !editName.trim() || !editAmount || !editCategory}
                >
                  {editSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </form>

        </DialogContent>
      </Dialog>

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
