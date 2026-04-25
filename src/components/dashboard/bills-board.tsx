"use client";

import { useState, useMemo, useTransition } from "react";
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
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { useUser } from "@/hooks/use-user";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { userPreferencesQueryOptions } from "@/lib/query/user-preferences-query";
import { billsDataQueryOptions } from "@/lib/query/bills";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import {
  getDueDayOfMonthFromYmd,
  effectiveDueDateInPaidMonth,
} from "@/lib/expense-due-date";
import { formatCurrency, cn } from "@/lib/utils";
import Image from "next/image";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import {
  toggleBillPayment,
  addBill,
  updateBill,
  deleteBill,
  type BillRow,
} from "@/actions/bills";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const BILLING_PERIOD_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

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
  fuchsia: "#d946ef",
  lime: "#84cc16",
  cyan: "#06b6d4",
  red: "#ef4444",
  blue: "#3b82f6",
  pink: "#ec4899",
  yellow: "#eab308",
  purple: "#a855f7",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function getCategoryDotColor(bgClass: string): string {
  const match = bgClass.match(/bg-(\w+)-\d+/);
  if (!match) return "#94a3b8";
  return TAILWIND_DOT_COLORS[match[1]] ?? "#94a3b8";
}


function formatDueDay(bill: BillRow, paidMonth: string): string {
  if (bill.billing_period === "yearly") {
    const day = getDueDayOfMonthFromYmd(bill.due_date);
    const monthName = MONTH_NAMES[(bill.due_month ?? 1) - 1] ?? "";
    return `${monthName} ${day}`;
  }
  if (bill.billing_period === "quarterly") {
    const day = getDueDayOfMonthFromYmd(bill.due_date);
    return `Day ${day} (quarterly)`;
  }
  const eff = effectiveDueDateInPaidMonth(bill.due_date, paidMonth);
  if (!eff) return "—";
  return `Due ${eff.getDate()} ${MONTH_NAMES[eff.getMonth()]}`;
}

// ─── Bill dialog ─────────────────────────────────────────────────────────────

type BillFormState = {
  categoryId: string;
  note: string;
  amount: string;
  dueDate: string;
  endDate: string;
  billingPeriod: "monthly" | "quarterly" | "yearly";
  dueMonth: string;
  reminderDays: number[];
};

const EMPTY_FORM: BillFormState = {
  categoryId: "utilities",
  note: "",
  amount: "",
  dueDate: "",
  endDate: "",
  billingPeriod: "monthly",
  dueMonth: "1",
  reminderDays: [],
};

function billToForm(bill: BillRow): BillFormState {
  const day = getDueDayOfMonthFromYmd(bill.due_date);
  return {
    categoryId: bill.category_id,
    note: bill.note ?? "",
    amount: String(bill.amount),
    dueDate: day ? String(day) : "15",
    endDate: bill.end_date ?? "",
    billingPeriod: bill.billing_period,
    dueMonth: String(bill.due_month ?? 1),
    reminderDays: bill.reminder_days_before ?? [],
  };
}

const REMINDER_OPTIONS = [
  { value: 3, label: "3 days before" },
  { value: 1, label: "1 day before" },
  { value: 0, label: "On due date" },
] as const;

function BillDialog({
  open,
  onClose,
  onSave,
  initial,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: BillFormState) => void;
  initial?: BillFormState;
  isPending: boolean;
}) {
  const { data: dbCategories } = useQuery(categoriesQueryOptions());
  const categories = dbCategories && dbCategories.length > 0 ? dbCategories : EXPENSE_CATEGORIES;

  const [form, setForm] = useState<BillFormState>(initial ?? EMPTY_FORM);

  // reset when dialog opens with new initial
  useState(() => {
    if (open) setForm(initial ?? EMPTY_FORM);
  });

  function set<K extends keyof BillFormState>(key: K, val: BillFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function toggleReminder(day: number) {
    setForm((prev) => ({
      ...prev,
      reminderDays: prev.reminderDays.includes(day)
        ? prev.reminderDays.filter((d) => d !== day)
        : [...prev.reminderDays, day],
    }));
  }

  const amountNum = parseFloat(form.amount);
  const isValid =
    form.categoryId &&
    form.note.trim() &&
    !isNaN(amountNum) &&
    amountNum > 0 &&
    form.dueDate;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Bill" : "Add Bill"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Row 1 — Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Internet, Electricity"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </div>

          {/* Row 2 — Category + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
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
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </div>
          </div>

          {/* Row 3 — Due Date + End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due Day</Label>
              <Select value={form.dueDate} onValueChange={(v) => set("dueDate", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day of the month" />
                </SelectTrigger>
                <SelectContent className="max-h-52">
                  <SelectItem value="15">{ordinal(15)} of the month</SelectItem>
                  <SelectItem value="31">End of the month</SelectItem>
                  <SelectSeparator />
                  {Array.from({ length: 31 }, (_, i) => i + 1)
                    .filter((d) => d !== 15 && d !== 31)
                    .map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {ordinal(d)} of the month
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                End Date{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <DatePicker
                value={form.endDate}
                onChange={(ymd) => set("endDate", ymd)}
                placeholder="No end date"
              />
            </div>
          </div>

          {/* Row 4 — Billing Period (+ Due Month if yearly) */}
          <div className={cn("grid gap-3", form.billingPeriod === "yearly" ? "grid-cols-2" : "grid-cols-1")}>
            <div className="space-y-1.5">
              <Label>Billing Period</Label>
              <Select
                value={form.billingPeriod}
                onValueChange={(v) => set("billingPeriod", v as BillFormState["billingPeriod"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.billingPeriod === "yearly" && (
              <div className="space-y-1.5">
                <Label>Due Month</Label>
                <Select value={form.dueMonth} onValueChange={(v) => set("dueMonth", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Row 5 — Reminder */}
          <div className="space-y-1.5">
            <Label>Reminders</Label>
            <div className="flex gap-2">
              {REMINDER_OPTIONS.map(({ value, label }) => {
                const active = form.reminderDays.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleReminder(value)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="w-1/2" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button className="w-1/2" onClick={() => onSave(form)} disabled={!isValid || isPending}>
            {isPending ? "Saving…" : initial ? "Save changes" : "Add bill"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bills Pie Chart ─────────────────────────────────────────────────────────

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

function BillsPieChart({ bills, paidIds, currency }: { bills: BillRow[]; paidIds: Set<string>; currency: string }) {
  const data = useMemo(() => {
    const paid = bills.filter((b) => paidIds.has(b.id)).reduce((s, b) => s + b.amount, 0);
    const unpaid = bills.filter((b) => !paidIds.has(b.id)).reduce((s, b) => s + b.amount, 0);
    return [
      { name: "Paid", value: paid, color: "#10b981" },
      { name: "Unpaid", value: unpaid, color: "#f97316" },
    ].filter((d) => d.value > 0);
  }, [bills, paidIds]);

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
            formatter={(value) => [formatCurrency(Number(value ?? 0), currency), ""]}
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

// ─── Bill row ─────────────────────────────────────────────────────────────────

function BillRow({
  bill,
  isPaid,
  isPending,
  currency,
  paidMonth,
  onToggle,
  onEdit,
  onDelete,
}: {
  bill: BillRow;
  isPaid: boolean;
  isPending: boolean;
  currency: string;
  paidMonth: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat =
    EXPENSE_CATEGORIES.find((c) => c.id === bill.category_id) ?? EXPENSE_CATEGORIES[0];
  const dotColor = getCategoryDotColor(cat?.bgClass ?? "");
  const dueDateLabel = formatDueDay(bill, paidMonth);

  return (
    <div
      onClick={onEdit}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
        isPaid
          ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      {/* Paid toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        disabled={isPending}
        className="flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        aria-label={isPaid ? "Mark unpaid" : "Mark paid"}
      >
        {isPaid ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      {/* Category dot */}
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            isPaid && "line-through text-muted-foreground",
          )}
        >
          {bill.note ?? cat?.label}
        </p>
        <p className="truncate text-xs text-muted-foreground">{dueDateLabel}</p>
      </div>

      {/* Billing period badge */}
      <Badge variant="outline" className="hidden sm:flex flex-shrink-0 text-xs capitalize">
        {BILLING_PERIOD_LABELS[bill.billing_period] ?? bill.billing_period}
      </Badge>

      {/* Amount */}
      <p
        className={cn(
          "flex-shrink-0 text-sm font-semibold tabular-nums",
          isPaid && "text-muted-foreground",
        )}
      >
        {formatCurrency(bill.amount, currency)}
      </p>

      {/* Actions */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete bill"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main board ──────────────────────────────────────────────────────────────

type PeriodTab = "monthly" | "quarterly" | "yearly";

export function BillsBoard() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const paidMonth = getCurrentPaidMonth();
  const [activeTab, setActiveTab] = useState<PeriodTab>("monthly");
  const [addOpen, setAddOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const { data, isLoading } = useQuery({
    ...billsDataQueryOptions(paidMonth),
    enabled: !!user,
  });

  const { data: prefs } = useQuery({
    ...userPreferencesQueryOptions(user?.id),
    enabled: !!user,
  });

  const currency = prefs?.currency ?? DEFAULT_USER_PREFERENCES.currency;
  const bills = data?.bills ?? [];
  const paidIds = useMemo(() => new Set(data?.paidBillIds ?? []), [data?.paidBillIds]);

  // Filtered by tab
  const filteredBills = useMemo(
    () => bills.filter((b) => b.billing_period === activeTab),
    [bills, activeTab],
  );

  // Summary
  const { totalMonthly, totalPaid, totalRemaining, paidCount } = useMemo(() => {
    const monthly = bills
      .filter((b) => b.billing_period === "monthly")
      .reduce((s, b) => s + b.amount, 0);
    const paid = bills.filter((b) => paidIds.has(b.id)).reduce((s, b) => s + b.amount, 0);
    return {
      totalMonthly: monthly,
      totalPaid: paid,
      totalRemaining: monthly - bills.filter((b) => b.billing_period === "monthly" && paidIds.has(b.id)).reduce((s, b) => s + b.amount, 0),
      paidCount: bills.filter((b) => paidIds.has(b.id)).length,
    };
  }, [bills, paidIds]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    monthly: bills.filter((b) => b.billing_period === "monthly").length,
    quarterly: bills.filter((b) => b.billing_period === "quarterly").length,
    yearly: bills.filter((b) => b.billing_period === "yearly").length,
  }), [bills]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.billData(paidMonth) });
  }

  async function handleToggle(billId: string) {
    setPendingIds((prev) => new Set(prev).add(billId));
    await toggleBillPayment(billId, paidMonth);
    invalidate();
    setPendingIds((prev) => { const s = new Set(prev); s.delete(billId); return s; });
  }

  async function handleAdd(form: BillFormState) {
    startTransition(async () => {
      const dueDateYmd = `1970-01-${form.dueDate.padStart(2, "0")}`;
      const res = await addBill(
        form.categoryId,
        parseFloat(form.amount),
        form.note,
        dueDateYmd,
        form.billingPeriod,
        form.billingPeriod === "yearly" ? parseInt(form.dueMonth, 10) : undefined,
        undefined,
        form.reminderDays.length > 0 ? form.reminderDays : undefined,
        "both",
        form.endDate || undefined,
      );
      if (!res.error) {
        setAddOpen(false);
        invalidate();
      }
    });
  }

  async function handleEdit(form: BillFormState) {
    if (!editingBill) return;
    startTransition(async () => {
      const dueDateYmd = `1970-01-${form.dueDate.padStart(2, "0")}`;
      const res = await updateBill(
        editingBill.id,
        form.categoryId,
        parseFloat(form.amount),
        form.note,
        dueDateYmd,
        form.billingPeriod,
        form.billingPeriod === "yearly" ? parseInt(form.dueMonth, 10) : undefined,
        undefined,
        form.reminderDays.length > 0 ? form.reminderDays : undefined,
        "both",
        form.endDate || undefined,
      );
      if (!res.error) {
        setEditingBill(null);
        invalidate();
      }
    });
  }

  async function handleDelete() {
    if (!deletingId) return;
    startTransition(async () => {
      await deleteBill(deletingId);
      setDeletingId(null);
      invalidate();
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
      </div>

      {/* Summary: stats (1/3) + pie chart (2/3) */}
      <div className="flex gap-3">
        {/* Stat cards */}
        <div className="flex w-1/3 flex-col gap-3">
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Bills - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(totalMonthly, currency)}</p>
            <p className="text-[11px] text-muted-foreground">{tabCounts.monthly} monthly bill{tabCounts.monthly !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Bills - Remaining</p>
            <p className={cn("mt-0.5 text-lg font-bold tabular-nums", totalRemaining > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
              {formatCurrency(totalRemaining, currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {tabCounts.monthly - bills.filter((b) => b.billing_period === "monthly" && paidIds.has(b.id)).length} unpaid
            </p>
          </div>
        </div>

        {/* Pie chart */}
        <div className="w-2/3">
          {bills.length > 0 ? (
            <Card className="h-full">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Paid vs unpaid
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-3">
                <BillsPieChart bills={bills} paidIds={paidIds} currency={currency} />
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              Add a bill to see the chart
            </div>
          )}
        </div>
      </div>

      {/* Tabs + list */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            {(["monthly", "quarterly", "yearly"] as PeriodTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab}
                {tabCounts[tab] > 0 && (
                  <span className="ml-1 opacity-60">{tabCounts[tab]}</span>
                )}
              </button>
            ))}
          </div>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Bill
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Image src="/favicon.png" alt="" aria-hidden className="h-40 w-40 animate-breathing" width={40} height={40} />
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Receipt className="h-8 w-8 opacity-30" />
              <p className="text-sm">No {activeTab} bills yet.</p>
            </div>
          ) : (
            filteredBills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                isPaid={paidIds.has(bill.id)}
                isPending={pendingIds.has(bill.id)}
                currency={currency}
                paidMonth={paidMonth}
                onToggle={() => handleToggle(bill.id)}
                onEdit={() => setEditingBill(bill)}
                onDelete={() => setDeletingId(bill.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Add dialog */}
      {addOpen && (
        <BillDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSave={handleAdd}
          isPending={isPending}
        />
      )}

      {/* Edit dialog */}
      {editingBill && (
        <BillDialog
          open={!!editingBill}
          onClose={() => setEditingBill(null)}
          onSave={handleEdit}
          initial={billToForm(editingBill)}
          isPending={isPending}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete bill?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the bill and all its payment history.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="w-1/2" onClick={() => setDeletingId(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" className="w-1/2" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
