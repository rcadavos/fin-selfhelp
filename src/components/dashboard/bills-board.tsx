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
  Download,
  LayoutGrid,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/ui/date-picker";
import { useUser } from "@/hooks/use-user";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { userPreferencesQueryOptions } from "@/lib/query/user-preferences-query";
import { billsDataQueryOptions } from "@/lib/query/bills";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import {
  getDueDayOfMonthFromYmd,
  effectiveDueDateInPaidMonth,
} from "@/lib/expense-due-date";
import { formatCurrency, cn } from "@/lib/utils";
import Image from "next/image";
import { ContentHeader } from "@/components/app/content-header";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import {
  toggleBillPayment,
  addBill,
  updateBill,
  deleteBill,
  type BillRow,
  type BillsData,
} from "@/actions/bills";
import { type AccountRow } from "@/actions/accounts";
import { accountsQueryOptions } from "@/lib/query/accounts";
import Link from "next/link";

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
  const { data: capabilities } = useQuery(subscriptionCapabilitiesQueryOptions());
  const hasProAccess = capabilities?.hasProLevelAccess ?? false;
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className={cn("grid gap-3", form.billingPeriod === "yearly" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
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
            <div className="flex items-center justify-between">
              <Label>Reminders</Label>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Pro / Premium
              </span>
            </div>
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
            {!hasProAccess && (
              <p className="text-[11px] text-muted-foreground">
                Reminders require a Pro or Premium plan. Upgrade to activate them.
              </p>
            )}
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
  isOverdue,
  isPending,
  currency,
  paidMonth,
  accountMap,
  onToggle,
  onEdit,
  onDelete,
}: {
  bill: BillRow;
  isPaid: boolean;
  isOverdue: boolean;
  isPending: boolean;
  currency: string;
  paidMonth: string;
  accountMap: Record<string, AccountRow>;
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
          : isOverdue
            ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
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
          <Circle className={cn("h-5 w-5", isOverdue && "text-amber-500")} />
        )}
      </button>

      {/* Category dot */}
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-sm font-medium",
              isPaid && "line-through text-muted-foreground",
            )}
          >
            {bill.note ?? cat?.label}
          </p>
          {isOverdue && !isPaid && (
            <span className="shrink-0 rounded-full border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Outstanding
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{dueDateLabel}</p>
        {bill.account_id && accountMap[bill.account_id] && (
          <span
            className="mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${accountMap[bill.account_id].color}22`,
              color: accountMap[bill.account_id].color,
            }}
          >
            {accountMap[bill.account_id].account_alias}
          </span>
        )}
      </div>

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

// ─── Export helpers ──────────────────────────────────────────────────────────

type CatList = Array<{ id: string; label: string; bgClass: string }>;

function getCategoryLabel(id: string, categories: CatList): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}

function exportBillsToCSV(bills: BillRow[], paidIds: Set<string>, currency: string, categories: CatList): void {
  const headers = ["Name", "Category", "Amount", "Billing Period", "Status"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = bills.map((b) => [
    esc(b.note ?? getCategoryLabel(b.category_id, categories)),
    esc(getCategoryLabel(b.category_id, categories)),
    b.amount,
    b.billing_period,
    paidIds.has(b.id) ? "Paid" : "Unpaid",
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
    download: `bills-${new Date().toISOString().slice(0, 10)}.csv`,
    style: "display:none",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportBillsToExcel(bills: BillRow[], paidIds: Set<string>, currency: string, categories: CatList): void {
  const headers = ["Name", "Category", "Amount", "Billing Period", "Status"];
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headerRow = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const dataRows = bills.map((b) => {
    const cells = [
      b.note ?? getCategoryLabel(b.category_id, categories),
      getCategoryLabel(b.category_id, categories),
      String(b.amount),
      b.billing_period,
      paidIds.has(b.id) ? "Paid" : "Unpaid",
    ].map((v) => `<td>${esc(v)}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table><tr>${headerRow}</tr>${dataRows}</table></body></html>`;
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })),
    download: `bills-${new Date().toISOString().slice(0, 10)}.xls`,
    style: "display:none",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Categories dialog ────────────────────────────────────────────────────────

function CategoriesDialog({
  open,
  onClose,
  bills,
  paidIds,
  currency,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  bills: BillRow[];
  paidIds: Set<string>;
  currency: string;
  categories: CatList;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { total: number; paid: number; count: number }>();
    for (const b of bills) {
      const entry = map.get(b.category_id) ?? { total: 0, paid: 0, count: 0 };
      entry.total += b.amount;
      entry.count += 1;
      if (paidIds.has(b.id)) entry.paid += b.amount;
      map.set(b.category_id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, label: getCategoryLabel(id, categories), ...v }))
      .sort((a, b) => b.total - a.total);
  }, [bills, paidIds, categories]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bills by Category</DialogTitle>
        </DialogHeader>
        {grouped.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No bills yet.</p>
        ) : (
          <div className="divide-y">
            {grouped.map(({ id, label, total, paid, count }) => {
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
              const dotColor = getCategoryDotColor(
                categories.find((c) => c.id === id)?.bgClass ?? ""
              );
              return (
                <div key={id} className="flex items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(total, currency)}</p>
                    <p className="text-[11px] text-muted-foreground">{count} bill{count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  const [categoriesOpen, setCategoriesOpen] = useState(false);
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
  const { data: accounts = [] } = useQuery(accountsQueryOptions());
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])) as Record<string, AccountRow>,
    [accounts]
  );
  const { data: dbCategories } = useQuery(categoriesQueryOptions());
  const categories: CatList = dbCategories && dbCategories.length > 0
    ? dbCategories.map((c) => ({ id: c.id, label: c.label, bgClass: c.bgClass }))
    : EXPENSE_CATEGORIES;
  const currency = prefs?.currency ?? DEFAULT_USER_PREFERENCES.currency;
  const bills = data?.bills ?? [];
  const paidIds = useMemo(() => new Set(data?.paidBillIds ?? []), [data?.paidBillIds]);

  // Filtered by tab
  const filteredBills = useMemo(
    () => bills.filter((b) => b.billing_period === activeTab),
    [bills, activeTab],
  );

  // Sorted: outstanding → unpaid → paid, then by due date within each group
  const sortedFilteredBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function statusRank(bill: BillRow): number {
      if (paidIds.has(bill.id)) return 2;
      const eff = effectiveDueDateInPaidMonth(bill.due_date, paidMonth);
      if (eff && eff < today) return 0; // outstanding
      return 1; // unpaid
    }

    function dueTime(bill: BillRow): number {
      return effectiveDueDateInPaidMonth(bill.due_date, paidMonth)?.getTime() ?? Infinity;
    }

    return [...filteredBills].sort((a, b) => {
      const rankDiff = statusRank(a) - statusRank(b);
      if (rankDiff !== 0) return rankDiff;
      return dueTime(a) - dueTime(b);
    });
  }, [filteredBills, paidIds, paidMonth]);

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
    const queryKey = queryKeys.billData(paidMonth);
    const snapshot = queryClient.getQueryData(queryKey);

    // Optimistic flip
    queryClient.setQueryData<BillsData | null>(queryKey, (old) => {
      if (!old) return old;
      const wasPaid = old.paidBillIds.includes(billId);
      return {
        ...old,
        paidBillIds: wasPaid
          ? old.paidBillIds.filter((id) => id !== billId)
          : [...old.paidBillIds, billId],
      };
    });

    setPendingIds((prev) => new Set(prev).add(billId));
    const res = await toggleBillPayment(billId, paidMonth);
    setPendingIds((prev) => { const s = new Set(prev); s.delete(billId); return s; });

    if (res.error) {
      queryClient.setQueryData(queryKey, snapshot);
    } else {
      invalidate();
    }
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
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <ContentHeader
        title="Bills"
        icon={Receipt}
        className="mb-0"
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
                <DropdownMenuItem onClick={() => exportBillsToCSV(bills, paidIds, currency, categories)}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBillsToExcel(bills, paidIds, currency, categories)}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Summary: stats + pie chart */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Stat cards */}
        <div className="flex flex-row gap-3 sm:w-1/3 sm:flex-col">
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Bills - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(totalMonthly, currency)}</p>
            <p className="text-[11px] text-muted-foreground">{tabCounts.monthly} monthly bill{tabCounts.monthly !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Bills - Remaining</p>
            <p className={cn("mt-0.5 text-lg font-bold tabular-nums", totalRemaining > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
              {formatCurrency(totalRemaining, currency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {tabCounts.monthly - bills.filter((b) => b.billing_period === "monthly" && paidIds.has(b.id)).length} unpaid
            </p>
          </div>
        </div>

        {/* Pie chart */}
        <div className="sm:w-2/3">
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
              <Image src="/favicon.png" alt="" aria-hidden className="h-10 w-10 animate-breathing" width={40} height={40} />
            </div>
          ) : sortedFilteredBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Receipt className="h-8 w-8 opacity-30" />
              <p className="text-sm">No {activeTab} bills yet.</p>
            </div>
          ) : (
            sortedFilteredBills.map((bill) => {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const eff = effectiveDueDateInPaidMonth(bill.due_date, paidMonth);
              const isOverdue = !paidIds.has(bill.id) && !!eff && eff < today;
              return (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  isPaid={paidIds.has(bill.id)}
                  isOverdue={isOverdue}
                  isPending={pendingIds.has(bill.id)}
                  currency={currency}
                  paidMonth={paidMonth}
                  accountMap={accountMap}
                  onToggle={() => handleToggle(bill.id)}
                  onEdit={() => setEditingBill(bill)}
                  onDelete={() => setDeletingId(bill.id)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Categories dialog */}
      <CategoriesDialog
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        bills={bills}
        paidIds={paidIds}
        currency={currency}
        categories={categories}
      />

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
