"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useTransition } from "react";
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
  Bell,
  Car,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  Receipt,
  Download,
  LayoutGrid,
  Lock,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
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
import { categoriesQueryOptions } from "@/lib/query/categories";
import { userPreferencesQueryOptions } from "@/lib/query/user-preferences-query";
import { billsDataQueryOptions } from "@/lib/query/bills";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import {
  getDueDayOfMonthFromYmd,
  effectiveDueDateInPaidMonth,
  parseYmToYearMonth,
} from "@/lib/expense-due-date";
import { formatCurrency, cn } from "@/lib/utils";
import { SpendingByCategoryCollapsibleCard } from "@/components/dashboard/spending-by-category-collapsible-card";
import { ContentHeader } from "@/components/app/content-header";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import {
  toggleBillPayment,
  markBillPaid,
  addBill,
  updateBill,
  deleteBill,
  type BillRow,
  type BillsData,
} from "@/actions/bills";
import { PartialPaymentDialog } from "@/components/dashboard/partial-payment-dialog";
import { type AccountRow } from "@/actions/accounts";
import { accountsQueryOptions, invalidateAccountQueries } from "@/lib/query/accounts";
import { AccountSelect } from "@/components/app/account-select";
import {
  vehiclesQueryOptions,
  buildVehicleColorMap,
  invalidateVehicleQueriesIfTransportAffected,
} from "@/lib/query/vehicles";
import { type VehicleRow } from "@/actions/vehicles";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedAmount } from "@/components/ui/animated-amount";
import { TAILWIND_DOT_COLORS } from "@/lib/constants/tailwind-dot-colors";
import { TRANSPORT_EXPENSE_CATEGORY_ID } from "@/lib/constants/expense-categories";
import { VEHICLE_EXPENSE_CATEGORIES, labelForVehicleExpenseCategory } from "@/lib/constants/vehicle-categories";
import { DashboardSkeleton } from "./dashboard-skeleton";

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

function effectiveBillDueDate(bill: BillRow, today: Date, paidMonthYm: string): Date | null {
  const dueDay = getDueDayOfMonthFromYmd(bill.due_date);
  if (!dueDay) return null;
  const ym = parseYmToYearMonth(paidMonthYm);

  if (bill.billing_period === "yearly") {
    const dueMonth1 = bill.due_month ?? 1;
    const year = ym?.year ?? today.getFullYear();
    const lastDay = new Date(year, dueMonth1, 0).getDate();
    return new Date(year, dueMonth1 - 1, Math.min(dueDay, lastDay));
  }

  if (bill.billing_period === "quarterly") {
    const qStartMonth = ym
      ? Math.floor((ym.month1to12 - 1) / 3) * 3
      : Math.floor(today.getMonth() / 3) * 3; // 0, 3, 6, or 9
    const year = ym?.year ?? today.getFullYear();
    const lastDay = new Date(year, qStartMonth + 1, 0).getDate();
    return new Date(year, qStartMonth, Math.min(dueDay, lastDay));
  }

  return effectiveDueDateInPaidMonth(bill.due_date, paidMonthYm);
}

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

// ─── Bill dialog ─────────────────────────────────────────────────────────────
// The form dialog itself lives in planned-expense-form-dialog.tsx so it can be
// reused from the detail page.
import {
  PlannedExpenseFormDialog as BillDialog,
  billToForm,
  EMPTY_BILL_FORM as EMPTY_FORM,
  type BillFormState,
} from "@/components/dashboard/planned-expense-form-dialog";


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

function BillsPieChart({ bills, currency, categories }: { bills: BillRow[]; currency: string; categories: CatList }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bills) map.set(b.category_id, (map.get(b.category_id) ?? 0) + b.amount);
    return Array.from(map.entries())
      .map(([id, value]) => ({
        name: categories.find((c) => c.id === id)?.label ?? id,
        value,
        color: getCategoryDotColor(categories.find((c) => c.id === id)?.bgClass ?? ""),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [bills, categories]);

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
            cx="35%"
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
              return [`${pct}% : ${formatCurrency(Number(value ?? 0), currency)}`, ""];
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
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
  isPartial,
  amountPaid,
  isOverdue,
  isUpcoming,
  isPending,
  currency,
  paidMonth,
  accountMap,
  vehicleMap,
  vehicleColorMap,
  categories,
  onToggle,
  onPartialClick,
  onEdit,
  onDelete,
  isLockedFreeReminder,
}: {
  bill: BillRow;
  /** True if amountPaid >= bill.amount. */
  isPaid: boolean;
  /** True if 0 < amountPaid < bill.amount. */
  isPartial: boolean;
  /** Amount actually paid this month for this bill (0 if no payment row). */
  amountPaid: number;
  isOverdue: boolean;
  isUpcoming: boolean;
  isPending: boolean;
  currency: string;
  paidMonth: string;
  accountMap: Record<string, AccountRow>;
  vehicleMap: Record<string, VehicleRow>;
  vehicleColorMap: Record<string, string>;
  categories: CatList;
  /** Full-paid toggle: marks fully paid if unpaid, removes the row if any payment exists. */
  onToggle: () => void;
  /** Opens the partial-payment dialog for this bill. */
  onPartialClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isLockedFreeReminder?: boolean;
}) {
  const router = useRouter();
  const cat = categories.find((c) => c.id === bill.category_id);
  const dotColor = getCategoryDotColor(cat?.bgClass ?? "");
  const dueDateLabel = formatDueDay(bill, paidMonth);
  const reminderLabel = (() => {
    const days = bill.reminder_days_before;
    if (!days?.length) return null;
    const beforeDays = days.filter((d) => d !== 0).sort((a, b) => b - a);
    const hasDueDate = days.includes(0);
    const parts: string[] = [];
    if (beforeDays.length > 0) parts.push(`${beforeDays.map((d) => `${d}d`).join(", ")} before`);
    if (hasDueDate) parts.push("Due date");
    return parts.join(", ");
  })();

  return (
    <div
      onClick={() => router.push(`/dashboard/planned-expenses/${bill.id}`)}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
        isPaid
          ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-400/60 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/50"
          : isPartial
            ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
            : isOverdue
              ? "border-red-300 bg-red-50/60 hover:bg-red-50 dark:border-red-700/50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
              : isUpcoming
                ? "border-blue-200 bg-blue-50/60 hover:bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                : "border-border bg-card hover:bg-muted/40",
      )}
    >
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
          {bill.vehicle_id && vehicleMap[bill.vehicle_id] && (() => {
            const color = vehicleColorMap[bill.vehicle_id!] ?? "#6b7280";
            const vCatFull = labelForVehicleExpenseCategory(bill.vehicle_category);
            const vCatShort = vCatFull
              ? (vCatFull.includes(" (") ? vCatFull.slice(0, vCatFull.indexOf(" (")) : vCatFull)
              : null;
            const vehicleLine =
              vCatShort != null
                ? `${vehicleMap[bill.vehicle_id!].name} • ${vCatShort}`
                : vehicleMap[bill.vehicle_id!].name;
            return (
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
              >
                <Car className="h-2.5 w-2.5" />
                {vehicleLine}
              </span>
            );
          })()}
          {isPaid ? (
            <span className="shrink-0 rounded-full border border-emerald-400/60 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              Paid
            </span>
          ) : isPartial ? (
            <span
              className="shrink-0 rounded-full border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              title={`${formatCurrency(amountPaid, currency)} of ${formatCurrency(bill.amount, currency)}`}
            >
              {formatCurrency(amountPaid, currency)} / {formatCurrency(bill.amount, currency)}
            </span>
          ) : isOverdue ? (
            <span className="shrink-0 rounded-full border border-red-400/60 bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
              Overdue
            </span>
          ) : isUpcoming ? (
            <span className="shrink-0 rounded-full border border-blue-400/60 bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Upcoming
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-muted-foreground/30 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Unpaid
            </span>
          )}
          {isLockedFreeReminder && (
            <span className="hidden sm:inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Lock className="h-2.5 w-2.5" />
              Reminder
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          <span style={{ color: dotColor }}>{cat?.label}</span>
          {dueDateLabel && <span className="hidden sm:inline text-muted-foreground/60"> • {dueDateLabel}</span>}
          {reminderLabel && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-muted-foreground/60">
              &nbsp;•&nbsp;<Bell className="inline h-2.5 w-2.5" />{" "}{reminderLabel}
            </span>
          )}
        </p>
        {cat && (dueDateLabel || reminderLabel || isLockedFreeReminder) && (
          <div className="sm:hidden flex flex-wrap items-center gap-1.5 mt-0.5">
            {dueDateLabel && (
              <span className="text-xs text-muted-foreground/60">{dueDateLabel}</span>
            )}
            {reminderLabel && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/60">
                <Bell className="h-3 w-3" />{reminderLabel}
              </span>
            )}
            {isLockedFreeReminder && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/60 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <Lock className="h-2.5 w-2.5" />
                Reminder
              </span>
            )}
          </div>
        )}
      </div>

      {/* Account badge — desktop only */}
      {bill.account_id && accountMap[bill.account_id] && (
        <span
          className="hidden sm:inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `${accountMap[bill.account_id].color}22`,
            color: accountMap[bill.account_id].color,
          }}
        >
          {accountMap[bill.account_id].account_alias}
        </span>
      )}

      {/* Amount + account badge below on mobile */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        {bill.account_id && accountMap[bill.account_id] && (
          <span
            className="sm:hidden inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${accountMap[bill.account_id].color}22`,
              color: accountMap[bill.account_id].color,
            }}
          >
            {accountMap[bill.account_id].account_alias}
          </span>
        )}
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isPaid && "text-muted-foreground line-through",
          )}
        >
          {formatCurrency(bill.amount, currency)}
        </p>
      </div>

      {/* Actions: 3-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 flex-shrink-0 self-center text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            disabled={isPending}
            aria-label="Planned expense actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {isPaid ? (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggle(); }}>
              <RotateCcw className="h-4 w-4" />
              Mark Unpaid
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggle(); }}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Mark Paid
            </DropdownMenuItem>
          )}
          {!isPaid && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPartialClick(); }}>
              <PiggyBank className="h-4 w-4 text-amber-600" />
              {isPartial ? "Add to Payment" : "Add Partial Payment"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
    download: `planned-expenses-${new Date().toISOString().slice(0, 10)}.csv`,
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
    download: `planned-expenses-${new Date().toISOString().slice(0, 10)}.xls`,
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
  paymentAmountByBillId,
  currency,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  bills: BillRow[];
  paymentAmountByBillId: Record<string, number>;
  currency: string;
  categories: CatList;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { total: number; paid: number; count: number }>();
    for (const b of bills) {
      const entry = map.get(b.category_id) ?? { total: 0, paid: 0, count: 0 };
      entry.total += b.amount;
      entry.count += 1;
      entry.paid += paymentAmountByBillId[b.id] ?? 0;
      map.set(b.category_id, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, label: getCategoryLabel(id, categories), ...v }))
      .sort((a, b) => b.total - a.total);
  }, [bills, paymentAmountByBillId, categories]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Planned Expenses by Category</DialogTitle>
        </DialogHeader>
        {grouped.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No planned expenses yet.</p>
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
                    <p className="text-[11px] text-muted-foreground">{count} planned expense{count !== 1 ? "s" : ""}</p>
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

  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentPaidMonth());
  const paidMonth = selectedMonth;
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
  const [activeTab, setActiveTab] = useState<PeriodTab>("monthly");
  const [addOpen, setAddOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillRow | null>(null);
  const [partialBill, setPartialBill] = useState<BillRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<
    | { kind: "insufficient_balance"; accountId: string; available: number; required: number; billNote: string }
    | { kind: "generic"; message: string }
    | null
  >(null);
  /** Mobile: chart body starts collapsed; tap the card header to expand. Desktop always shows the chart. */
  const [showMobileCategoryChart, setShowMobileCategoryChart] = useState(false);
  const [isPending, startTransition] = useTransition();

  const billsDataQuery = useQuery(billsDataQueryOptions(paidMonth));
  const prefsQuery = useQuery(userPreferencesQueryOptions(user?.id));
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
  const { data: dbCategories } = useSuspenseQuery(categoriesQueryOptions());
  const categories: CatList = useMemo(
    () => (dbCategories ?? []).map((c) => ({ id: c.id, label: c.label, bgClass: c.bgClass })),
    [dbCategories]
  );
  const currency = prefsQuery.data?.currency ?? DEFAULT_USER_PREFERENCES.currency;
  const bills = billsDataQuery.data?.bills ?? [];
  const paidIds = useMemo(() => new Set(billsDataQuery.data?.paidBillIds ?? []), [billsDataQuery.data?.paidBillIds]);
  const paymentAmountByBillId = billsDataQuery.data?.paymentAmountByBillId ?? {};
  const lockedFreeReminderBillId = billsDataQuery.data?.lockedFreeReminderBillId;
  const freeReminderUsed = useMemo(
    () => bills.filter((b) => b.reminder_days_before && b.reminder_days_before.length > 0).length,
    [bills],
  );

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
      const amountPaid = paymentAmountByBillId[bill.id] ?? 0;
      const isFullyPaid = amountPaid > 0 && amountPaid >= bill.amount;
      const isPartial = amountPaid > 0 && !isFullyPaid;
      if (isFullyPaid) return 4;
      if (isPartial) return 3;
      const eff = effectiveBillDueDate(bill, today, paidMonth);
      if (eff && eff < today) return 0; // overdue
      if (eff && eff > today) return 2; // upcoming
      return 1; // unpaid (due today or no due date)
    }

    function dueTime(bill: BillRow): number {
      return effectiveBillDueDate(bill, today, paidMonth)?.getTime() ?? Infinity;
    }

    return [...filteredBills].sort((a, b) => {
      const rankDiff = statusRank(a) - statusRank(b);
      if (rankDiff !== 0) return rankDiff;
      return dueTime(a) - dueTime(b);
    });
  }, [filteredBills, paymentAmountByBillId, paidMonth]);

  // Summary — reactive to active tab. paidAmt sums actual amount_paid so a
  // partial payment reduces "Remaining" by its real value, not the full bill amount.
  const { totalFiltered, totalRemaining, unpaidCount } = useMemo(() => {
    const total = filteredBills.reduce((s, b) => s + b.amount, 0);
    const paidAmt = filteredBills.reduce((s, b) => s + (paymentAmountByBillId[b.id] ?? 0), 0);
    return {
      totalFiltered: total,
      totalRemaining: Math.max(0, total - paidAmt),
      unpaidCount: filteredBills.filter((b) => !paidIds.has(b.id)).length,
    };
  }, [filteredBills, paidIds, paymentAmountByBillId]);

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

    // Optimistic flip — keep paidBillIds and paymentAmountByBillId in sync
    // so the stat cards reflect the change immediately.
    queryClient.setQueryData<BillsData | null>(queryKey, (old) => {
      if (!old) return old;
      const wasPaid = old.paidBillIds.includes(billId);
      const billAmount = old.bills.find((b) => b.id === billId)?.amount ?? 0;
      if (wasPaid) {
        const nextAmounts = { ...old.paymentAmountByBillId };
        delete nextAmounts[billId];
        return {
          ...old,
          paidBillIds: old.paidBillIds.filter((id) => id !== billId),
          paymentAmountByBillId: nextAmounts,
        };
      }
      return {
        ...old,
        paidBillIds: [...old.paidBillIds, billId],
        paymentAmountByBillId: { ...old.paymentAmountByBillId, [billId]: billAmount },
      };
    });

    setPendingIds((prev) => new Set(prev).add(billId));
    setToggleError(null);
    const res = await toggleBillPayment(billId, paidMonth);
    setPendingIds((prev) => { const s = new Set(prev); s.delete(billId); return s; });

    if (res.error) {
      queryClient.setQueryData(queryKey, snapshot);
      if (res.error === "insufficient_balance" && res.insufficientBalance) {
        const bill = bills.find((b) => b.id === billId);
        setToggleError({
          kind: "insufficient_balance",
          accountId: res.insufficientBalance.accountId,
          available: res.insufficientBalance.available,
          required: res.insufficientBalance.required,
          billNote: bill?.note?.trim() || getCategoryLabel(bill?.category_id ?? "", categories),
        });
      } else {
        setToggleError({ kind: "generic", message: res.error });
      }
    } else {
      invalidate();
      // Bill payment auto-creates an account transaction + expense entry when an account is linked.
      invalidateAccountQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] });
    }
  }

  async function handlePartialSubmit(absoluteAmount: number) {
    if (!partialBill) return;
    setToggleError(null);
    const res = await markBillPaid(partialBill.id, paidMonth, absoluteAmount);
    if (res.error === "insufficient_balance" && res.insufficientBalance) {
      setToggleError({
        kind: "insufficient_balance",
        accountId: res.insufficientBalance.accountId,
        available: res.insufficientBalance.available,
        required: res.insufficientBalance.required,
        billNote: partialBill.note?.trim() || getCategoryLabel(partialBill.category_id, categories),
      });
      return;
    }
    if (res.error) {
      setToggleError({ kind: "generic", message: res.error });
      return;
    }
    setPartialBill(null);
    invalidate();
    invalidateAccountQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] });
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
        form.autoDebit ? undefined : (form.reminderDays.length > 0 ? form.reminderDays : undefined),
        "both",
        form.endDate || undefined,
        form.accountId || null,
        form.vehicleId || null,
        form.vehicleCategory || null,
        form.autoDebit,
      );
      if (!res.error) {
        setAddOpen(false);
        invalidate();
        invalidateVehicleQueriesIfTransportAffected(queryClient, form.categoryId);
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
        form.autoDebit ? undefined : (form.reminderDays.length > 0 ? form.reminderDays : undefined),
        "both",
        form.endDate || undefined,
        form.accountId || null,
        form.vehicleId || null,
        form.vehicleCategory || null,
        form.autoDebit,
      );
      if (!res.error) {
        setEditingBill(null);
        invalidate();
        invalidateVehicleQueriesIfTransportAffected(queryClient, form.categoryId);
      }
    });
  }

  async function handleDelete() {
    if (!deletingId) return;
    startTransition(async () => {
      const bill = bills.find((b) => b.id === deletingId);
      await deleteBill(deletingId);
      setDeletingId(null);
      invalidate();
      invalidateVehicleQueriesIfTransportAffected(queryClient, bill?.category_id);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <ContentHeader
        title="Planned Expenses"
        subtitle="Manage your planned expenses, bills, due dates, and mark them as paid when you settle up."
        icon={Receipt}
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
            <p className="text-xs font-semibold tracking-wide text-muted-foreground capitalize">Planned - {activeTab}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              <AnimatedAmount value={totalFiltered} currency={currency} />
            </p>
            <p className="text-[11px] text-muted-foreground">{tabCounts[activeTab]} planned expense{tabCounts[activeTab] !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Planned - Remaining</p>
            <p className={cn("mt-0.5 text-lg font-bold tabular-nums", totalRemaining > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
              <AnimatedAmount value={totalRemaining} currency={currency} />
            </p>
            <p className="text-[11px] text-muted-foreground">{unpaidCount} unpaid</p>
          </div>
        </div>

        {/* Pie chart (mobile: tap section header to expand; desktop: always visible) */}
        <div className="sm:w-2/3">
          {billsDataQuery.isPending ? (
            <SpendingByCategoryCollapsibleCard
              expanded={showMobileCategoryChart}
              onToggle={() => setShowMobileCategoryChart((v) => !v)}
              panelId="planned-spending-by-category-body"
            >
              <Skeleton className="h-[160px] w-full" />
            </SpendingByCategoryCollapsibleCard>
          ) : bills.length > 0 ? (
            <SpendingByCategoryCollapsibleCard
              expanded={showMobileCategoryChart}
              onToggle={() => setShowMobileCategoryChart((v) => !v)}
              panelId="planned-spending-by-category-body"
            >
              <BillsPieChart bills={filteredBills} currency={currency} categories={categories} />
            </SpendingByCategoryCollapsibleCard>
          ) : (
            <SpendingByCategoryCollapsibleCard
              expanded={showMobileCategoryChart}
              onToggle={() => setShowMobileCategoryChart((v) => !v)}
              dashed
              panelId="planned-spending-by-category-body"
            >
              <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
                Add a planned expense to see the chart
              </div>
            </SpendingByCategoryCollapsibleCard>
          )}
        </div>
      </div>

      {/* Month selector + Tabs + list */}
      <div>
        <div className="mb-3 space-y-2 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-2 sm:space-y-0">
          <div className="flex items-center justify-between gap-2 sm:justify-start">
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
            <Button onClick={() => setAddOpen(true)} size="lg" className="gap-1.5 sm:hidden">
              <Plus className="h-4 w-4" />
              Add Planned Expense
            </Button>
          </div>

          <div className="inline-flex w-full items-center gap-0.5 rounded-md border bg-background p-0.5 sm:w-auto sm:justify-self-center">
            {(["monthly", "quarterly", "yearly"] as PeriodTab[]).map((tab) => (
              <Button
                key={tab}
                type="button"
                size="sm"
                variant={activeTab === tab ? "secondary" : "ghost"}
                className="group h-9 flex-1 px-3 text-sm capitalize sm:flex-none"
                onClick={() => setActiveTab(tab)}
              >
                <span className="inline-flex items-center gap-1">
                  <span>{tab}</span>
                  <Badge
                    variant={activeTab === tab ? "default" : "secondary"}
                    className={cn(
                      "h-5 min-w-5 px-1.5 text-[11px] transition-colors",
                      activeTab === tab
                        ? "bg-background text-foreground border-border group-hover:bg-background group-hover:text-foreground"
                        : "group-hover:bg-background group-hover:text-foreground group-hover:border-border"
                    )}
                  >
                    {tabCounts[tab]}
                  </Badge>
                </span>
              </Button>
            ))}
          </div>

          <Button onClick={() => setAddOpen(true)} size="lg" className="hidden gap-1.5 sm:inline-flex">
            <Plus className="h-4 w-4" />
            Add Planned Expense
          </Button>
        </div>

        {toggleError && (
          <div
            role="alert"
            className="mb-3 flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
          >
            {toggleError.kind === "insufficient_balance" ? (
              <div className="flex-1">
                <p className="font-semibold">Insufficient account balance</p>
                <p className="mt-0.5 text-xs text-destructive/90">
                  {accountMap[toggleError.accountId]?.account_alias ?? "This account"} has{" "}
                  {formatCurrency(toggleError.available, currency)} available, but{" "}
                  {toggleError.billNote ? `“${toggleError.billNote}”` : "this planned expense"} needs{" "}
                  {formatCurrency(toggleError.required, currency)}.
                </p>
              </div>
            ) : (
              <p className="flex-1">{toggleError.message}</p>
            )}
            <div className="flex shrink-0 gap-2">
              <Button asChild size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Link href="/dashboard/accounts">Go to Accounts</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setToggleError(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {billsDataQuery.isPending ? (
            <DashboardSkeleton variant="form" />
          ) : sortedFilteredBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Receipt className="h-8 w-8 opacity-30" />
              <p className="text-sm">No {activeTab} planned expenses yet.</p>
            </div>
          ) : (
            sortedFilteredBills.map((bill) => {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const eff = effectiveBillDueDate(bill, today, paidMonth);
              const amountPaid = paymentAmountByBillId[bill.id] ?? 0;
              const isFullyPaid = amountPaid >= bill.amount && amountPaid > 0;
              const isPartial = amountPaid > 0 && amountPaid < bill.amount;
              const hasAnyPayment = amountPaid > 0;
              const isOverdue = !hasAnyPayment && !!eff && eff < today;
              const isUpcoming = !hasAnyPayment && !!eff && eff > today;
              return (
                <BillRow
                  key={bill.id}
                  bill={bill}
                  isPaid={isFullyPaid}
                  isPartial={isPartial}
                  amountPaid={amountPaid}
                  isOverdue={isOverdue}
                  isUpcoming={isUpcoming}
                  isPending={pendingIds.has(bill.id)}
                  currency={currency}
                  paidMonth={paidMonth}
                  accountMap={accountMap}
                  vehicleMap={vehicleMap}
                  vehicleColorMap={vehicleColorMap}
                  categories={categories}
                  onToggle={() => handleToggle(bill.id)}
                  onPartialClick={() => { setToggleError(null); setPartialBill(bill); }}
                  onEdit={() => setEditingBill(bill)}
                  onDelete={() => setDeletingId(bill.id)}
                  isLockedFreeReminder={bill.id === lockedFreeReminderBillId}
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
        paymentAmountByBillId={paymentAmountByBillId}
        currency={currency}
        categories={categories}
      />

      {/* Add dialog */}
      {addOpen && (
        <BillDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSave={handleAdd}
          initial={{ ...EMPTY_FORM, billingPeriod: activeTab }}
          isPending={isPending}
          accounts={accounts}
          vehicles={vehicles}
          freeReminderUsed={freeReminderUsed}
          lockedFreeReminderBillId={lockedFreeReminderBillId}
        />
      )}

      {/* Edit dialog */}
      {editingBill && (
        <BillDialog
          open={!!editingBill}
          onClose={() => setEditingBill(null)}
          onSave={handleEdit}
          onDelete={() => { setEditingBill(null); setDeletingId(editingBill.id); }}
          initial={billToForm(editingBill)}
          editingBillId={editingBill.id}
          isPending={isPending}
          accounts={accounts}
          vehicles={vehicles}
          freeReminderUsed={freeReminderUsed}
          lockedFreeReminderBillId={lockedFreeReminderBillId}
        />
      )}

      {/* Partial payment dialog */}
      {partialBill && (
        <PartialPaymentDialog
          open={!!partialBill}
          onClose={() => setPartialBill(null)}
          billLabel={partialBill.note ?? getCategoryLabel(partialBill.category_id, categories)}
          billAmount={partialBill.amount}
          alreadyPaid={paymentAmountByBillId[partialBill.id] ?? 0}
          onSubmit={handlePartialSubmit}
          isPending={isPending}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete planned expense?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the planned expense and all its payment history.
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
