"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useTransition } from "react";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Download, LayoutGrid, Plus, Receipt } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { userPreferencesQueryOptions } from "@/lib/query/user-preferences-query";
import { billsDataQueryOptions } from "@/lib/query/bills";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { formatCurrency, cn } from "@/lib/utils";
import { ContentHeader } from "@/components/app/content-header";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import {
  toggleBillPayment,
  markBillPaid,
  addBill,
  updateBill,
  deleteBill,
  type BillRow as BillRowModel,
  type BillsData,
} from "@/actions/bills";
import { PartialPaymentDialog } from "@/components/dashboard/partial-payment-dialog";
import { type AccountRow } from "@/actions/accounts";
import {
  accountsQueryOptions,
  accountBalancesQueryOptions,
  invalidateAccountQueries,
} from "@/lib/query/accounts";
import {
  vehiclesQueryOptions,
  buildVehicleColorMap,
  invalidateVehicleQueriesIfTransportAffected,
} from "@/lib/query/vehicles";
import Link from "next/link";
import { TAILWIND_DOT_COLORS } from "@/lib/constants/tailwind-dot-colors";
import { ADD_PLANNED_EXPENSE_PARAM } from "@/lib/constants/app-mode";
import { useAppMode } from "@/hooks/use-app-mode";
import { DashboardSkeleton } from "./dashboard-skeleton";
import {
  PlannedExpenseFormDialog as BillDialog,
  billToForm,
  reminderDaysToPersist,
  EMPTY_BILL_FORM as EMPTY_FORM,
  type BillFormState,
} from "@/components/dashboard/planned-expense-form-dialog";
import {
  buildPlannedExpenseRows,
  groupPlannedExpenses,
  summarisePlannedExpenses,
  buildAccountCoverage,
  isFullyPaidBucket,
} from "@/lib/planned-expenses/grouping";
import { URGENCY_LABELS } from "@/lib/constants/planned-expenses";
import { ExpenseRow } from "@/components/dashboard/planned-expenses/expense-row";
import { ExpenseGroup } from "@/components/dashboard/planned-expenses/expense-group";
import { Runway } from "@/components/dashboard/planned-expenses/runway";
import { CoveragePanel } from "@/components/dashboard/planned-expenses/coverage-panel";
import { BillsHero } from "@/components/dashboard/planned-expenses/bills-hero";
import { MonthCalendar } from "@/components/dashboard/planned-expenses/month-calendar";

type CatList = Array<{ id: string; label: string; bgClass: string }>;

function getCategoryDotColor(bgClass: string): string {
  const match = bgClass.match(/bg-(\w+)-\d+/);
  if (!match) return "#94a3b8";
  return TAILWIND_DOT_COLORS[match[1]] ?? "#94a3b8";
}

function getCategoryLabel(id: string, categories: CatList): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}

// ─── Export helpers ──────────────────────────────────────────────────────────

function exportBillsToCSV(bills: BillRowModel[], paidIds: Set<string>, categories: CatList): void {
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

function exportBillsToExcel(bills: BillRowModel[], paidIds: Set<string>, categories: CatList): void {
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
  paymentAmountByBillId,
  currency,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  bills: BillRowModel[];
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
          <DialogTitle>Bills by Category</DialogTitle>
        </DialogHeader>
        {grouped.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No bills yet.</p>
        ) : (
          <div className="divide-y">
            {grouped.map(({ id, label, total, paid, count }) => {
              const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
              const dotColor = getCategoryDotColor(categories.find((c) => c.id === id)?.bgClass ?? "");
              return (
                <div key={id} className="flex items-center gap-3 py-3">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(total, currency)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {count} bill{count !== 1 ? "s" : ""}
                    </p>
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

export function BillsBoard() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isFeatureEnabled, isBillsMode } = useAppMode();
  const accountsEnabled = isFeatureEnabled("accounts");
  const autoDebitEnabled = isFeatureEnabled("autoDebit");

  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentPaidMonth());
  const paidMonth = selectedMonth;
  const monthOptions = useMemo(() => {
    const now = new Date();
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 13; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      opts.push({
        // Short month keeps every option the same width, so the trigger and the
        // dropdown never resize as you move between months.
        value: ym,
        label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      });
    }
    return opts;
  }, []);

  const [addOpen, setAddOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [settledCollapsed, setSettledCollapsed] = useState(true);
  // Deliberately not persisted — the panel returns on the next load.
  const [heroDismissed, setHeroDismissed] = useState(false);
  const [editingBill, setEditingBill] = useState<BillRowModel | null>(null);
  const [partialBill, setPartialBill] = useState<BillRowModel | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<
    | { kind: "insufficient_balance"; accountId: string; available: number; required: number; billNote: string }
    | { kind: "generic"; message: string }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Bills mode has no quick Add Entry panel, so its FAB deep-links here with `?add=1`.
   * The flag is read straight into the dialog's open state and stripped when it closes:
   * left in the URL it would reopen the dialog on every refresh or back navigation.
   */
  const addRequested = searchParams.get(ADD_PLANNED_EXPENSE_PARAM) === "1";
  const addDialogOpen = addOpen || addRequested;
  function closeAddDialog() {
    setAddOpen(false);
    if (!addRequested) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(ADD_PLANNED_EXPENSE_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  // useQuery (not Suspense): the board renders its own skeleton while this settles.
  const billsDataQuery = useQuery(billsDataQueryOptions(paidMonth));
  const prefsQuery = useQuery(userPreferencesQueryOptions(user?.id));
  const accountsQuery = useQuery({ ...accountsQueryOptions(), enabled: accountsEnabled });
  const balancesQuery = useQuery({ ...accountBalancesQueryOptions(), enabled: accountsEnabled });
  const vehiclesQuery = useQuery(vehiclesQueryOptions());
  const { data: dbCategories } = useSuspenseQuery(categoriesQueryOptions());

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])) as Record<string, AccountRow>,
    [accounts]
  );
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles]);
  const vehicleColorMap = useMemo(() => buildVehicleColorMap(vehicles), [vehicles]);
  const categories: CatList = useMemo(
    () => (dbCategories ?? []).map((c) => ({ id: c.id, label: c.label, bgClass: c.bgClass })),
    [dbCategories]
  );
  const currency = prefsQuery.data?.currency ?? DEFAULT_USER_PREFERENCES.currency;

  const bills = useMemo(() => billsDataQuery.data?.bills ?? [], [billsDataQuery.data?.bills]);
  const paidIds = useMemo(
    () => new Set(billsDataQuery.data?.paidBillIds ?? []),
    [billsDataQuery.data?.paidBillIds]
  );
  const failedIds = useMemo(
    () => new Set(billsDataQuery.data?.failedBillIds ?? []),
    [billsDataQuery.data?.failedBillIds]
  );
  const paymentAmountByBillId = useMemo(
    () => billsDataQuery.data?.paymentAmountByBillId ?? {},
    [billsDataQuery.data?.paymentAmountByBillId]
  );
  const paidAtByBillId = useMemo(
    () => billsDataQuery.data?.paidAtByBillId ?? {},
    [billsDataQuery.data?.paidAtByBillId]
  );
  const lockedFreeReminderBillId = billsDataQuery.data?.lockedFreeReminderBillId;
  const freeReminderUsed = useMemo(
    () => bills.filter((b) => b.reminder_days_before && b.reminder_days_before.length > 0).length,
    [bills]
  );

  // ── Derived board model ────────────────────────────────────────────────────
  // Every panel below reads these same rows, so a subtotal can never disagree
  // with the list it sits above.
  const rows = useMemo(
    () =>
      buildPlannedExpenseRows({
        bills,
        paymentAmountByBillId,
        paidAtByBillId,
        failedBillIds: failedIds,
        paidMonth,
      }),
    [bills, paymentAmountByBillId, paidAtByBillId, failedIds, paidMonth]
  );
  const groups = useMemo(() => groupPlannedExpenses(rows), [rows]);
  const summary = useMemo(() => summarisePlannedExpenses(rows), [rows]);
  const coverage = useMemo(
    () =>
      accountsEnabled
        ? buildAccountCoverage({ rows, accounts, balances: balancesQuery.data ?? {} })
        : [],
    [accountsEnabled, rows, accounts, balancesQuery.data]
  );
  const shortfallByAccountId = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of coverage) {
      if (c.accountId && c.shortfall > 0) map.set(c.accountId, c.shortfall);
    }
    return map;
  }, [coverage]);

  const monthMeta = useMemo(() => {
    const [yearStr, monthStr] = paidMonth.split("-");
    const year = Number(yearStr);
    const month0 = Number(monthStr) - 1;
    const monthDate = new Date(year, month0, 1);
    const now = new Date();
    return {
      year,
      month0,
      monthLabel: monthDate.toLocaleDateString("en-PH", { month: "long" }),
      daysInMonth: new Date(year, month0 + 1, 0).getDate(),
      todayDay: now.getFullYear() === year && now.getMonth() === month0 ? now.getDate() : null,
    };
  }, [paidMonth]);

  // Bills mode opens on the single most urgent unsettled bill; the rest queue behind it.
  const unsettled = useMemo(() => rows.filter((r) => !isFullyPaidBucket(r.bucket)), [rows]);
  const heroRow = unsettled[0] ?? null;
  const heroQueue = unsettled.slice(1, 4);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.billData(paidMonth) });
  }

  async function handleToggle(billId: string) {
    const queryKey = queryKeys.billData(paidMonth);
    const snapshot = queryClient.getQueryData(queryKey);

    queryClient.setQueryData<BillsData | null>(queryKey, (old) => {
      if (!old) return old;
      const wasPaid = old.paidBillIds.includes(billId);
      const billAmount = old.bills.find((b) => b.id === billId)?.amount ?? 0;
      if (wasPaid) {
        const nextAmounts = { ...old.paymentAmountByBillId };
        delete nextAmounts[billId];
        const nextPaidAt = { ...old.paidAtByBillId };
        delete nextPaidAt[billId];
        return {
          ...old,
          paidBillIds: old.paidBillIds.filter((id) => id !== billId),
          paymentAmountByBillId: nextAmounts,
          paidAtByBillId: nextPaidAt,
        };
      }
      const nextReasons = { ...old.failureReasonByBillId };
      delete nextReasons[billId];
      return {
        ...old,
        paidBillIds: [...old.paidBillIds, billId],
        paymentAmountByBillId: { ...old.paymentAmountByBillId, [billId]: billAmount },
        paidAtByBillId: { ...old.paidAtByBillId, [billId]: new Date().toISOString() },
        failedBillIds: old.failedBillIds.filter((id) => id !== billId),
        failureReasonByBillId: nextReasons,
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
        reminderDaysToPersist(form, autoDebitEnabled),
        "both",
        form.endDate || undefined,
        form.accountId || null,
        form.vehicleId || null,
        form.vehicleCategory || null,
        form.autoDebit,
      );
      if (!res.error) {
        closeAddDialog();
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
        reminderDaysToPersist(form, autoDebitEnabled),
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

  const labelVariant = isBillsMode ? "bills" : "full";

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <ContentHeader
        title="Bills"
        subtitle={
          summary.totalCount > 0
            ? `${summary.totalCount} this month. ${summary.settledCount} settled.`
            : "Everything you've committed to this month."
        }
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2">
            {isFeatureEnabled("expenses") ? (
              <Button variant="outline" size="sm" aria-label="Categories" asChild>
                <Link href="/dashboard/expenses/categories">
                  <LayoutGrid className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Categories</span>
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Categories"
                onClick={() => setCategoriesOpen(true)}
              >
                <LayoutGrid className="size-4" aria-hidden />
                <span className="hidden sm:inline">Categories</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportBillsToCSV(bills, paidIds, categories)}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBillsToExcel(bills, paidIds, categories)}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Month + add */}
      <div className="flex items-center justify-between gap-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          {/* ring-offset-0 matters: the primitive sets ring-offset-2, and with ring-0
              that offset still paints a stray 2px shadow on focus. */}
          <SelectTrigger className="h-10 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm font-medium shadow-none hover:bg-muted focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 [&>svg]:opacity-60">
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
        <Button onClick={() => setAddOpen(true)} size="lg" className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {billsDataQuery.isPending ? (
        <DashboardSkeleton variant="form" />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <Receipt className="size-8 opacity-30" />
          <p className="text-sm">No bills this month.</p>
        </div>
      ) : (
        <>
          {/* ── The month, at a glance ── */}
          {isBillsMode ? (
            <>
              {!heroDismissed && (
              <BillsHero
                onDismiss={() => setHeroDismissed(true)}
                next={heroRow}
                queue={heroQueue}
                currency={currency}
                isPending={heroRow ? pendingIds.has(heroRow.bill.id) : false}
                onMarkPaid={() => heroRow && handleToggle(heroRow.bill.id)}
                onPartialPayment={() => {
                  if (!heroRow) return;
                  setToggleError(null);
                  setPartialBill(heroRow.bill);
                }}
              />
              )}
              <MonthCalendar
                rows={rows}
                summary={summary}
                currency={currency}
                monthLabel={monthMeta.monthLabel}
                year={monthMeta.year}
                month0={monthMeta.month0}
                todayDay={monthMeta.todayDay}
              />
            </>
          ) : (
            <>
              <Runway
                rows={rows}
                summary={summary}
                currency={currency}
                monthLabel={monthMeta.monthLabel}
                daysInMonth={monthMeta.daysInMonth}
                todayDay={monthMeta.todayDay}
              />
              {coverage.length > 0 && <CoveragePanel coverage={coverage} currency={currency} />}
            </>
          )}

          {/* Reminders are one of only two features in bills mode, so the free
              ceiling is worth naming rather than hiding behind a locked pill. */}
          {isBillsMode && lockedFreeReminderBillId && (
            <div className="surface flex items-center gap-2.5 border border-dashed border-warning/50 bg-warning/[0.07] p-3">
              <Bell className="size-4 shrink-0 text-warning" aria-hidden />
              <span className="min-w-0 flex-1 text-[12.5px]">
                You&rsquo;re using your one free reminder
                <small className="mt-px block text-[11.5px] text-muted-foreground">
                  Pro sets a reminder on every bill.
                </small>
              </span>
              <Button asChild size="sm" variant="outline" className="shrink-0 border-warning/50 text-warning hover:bg-warning/10 hover:text-warning">
                <Link href="/dashboard/premium">See Pro</Link>
              </Button>
            </div>
          )}

          {toggleError && (
            <div
              role="alert"
              className="surface flex flex-col gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
            >
              {toggleError.kind === "insufficient_balance" ? (
                <div className="flex-1">
                  <p className="font-semibold">Insufficient account balance</p>
                  <p className="mt-0.5 text-xs text-destructive/90">
                    {accountMap[toggleError.accountId]?.account_alias ?? "This account"} has{" "}
                    {formatCurrency(toggleError.available, currency)} available, but{" "}
                    {toggleError.billNote ? `“${toggleError.billNote}”` : "this bill"} needs{" "}
                    {formatCurrency(toggleError.required, currency)}.
                  </p>
                  {!accountsEnabled && (
                    <p className="mt-0.5 text-xs text-destructive/90">
                      Balance checks haven&rsquo;t caught up with your app mode yet. Reload the page and try again.
                    </p>
                  )}
                </div>
              ) : (
                <p className="flex-1">{toggleError.message}</p>
              )}
              <div className="flex shrink-0 gap-2">
                {accountsEnabled && (
                  <Button asChild size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Link href="/dashboard/accounts">Go to Accounts</Link>
                  </Button>
                )}
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

          {/* ── The ledger, grouped by what needs you ── */}
          <div className="flex flex-col gap-5">
            {groups.map((group) => {
              const isSettled = group.bucket === "settled";
              const label =
                group.bucket === "later"
                  ? `Later in ${monthMeta.monthLabel}`
                  : URGENCY_LABELS[group.bucket][labelVariant];
              return (
                <ExpenseGroup
                  key={group.bucket}
                  bucket={group.bucket}
                  label={label}
                  count={group.rows.length}
                  subtotal={group.subtotal}
                  currency={currency}
                  collapsible={isSettled}
                  collapsed={isSettled && settledCollapsed}
                  onToggleCollapsed={() => setSettledCollapsed((v) => !v)}
                >
                  {group.rows.map((row) => {
                    const cat = categories.find((c) => c.id === row.bill.category_id);
                    const account = row.bill.account_id ? accountMap[row.bill.account_id] ?? null : null;
                    const shortfall = row.bill.account_id
                      ? shortfallByAccountId.get(row.bill.account_id)
                      : undefined;
                    return (
                      <ExpenseRow
                        key={row.bill.id}
                        row={row}
                        currency={currency}
                        categoryLabel={cat?.label ?? row.bill.category_id}
                        categoryColor={getCategoryDotColor(cat?.bgClass ?? "")}
                        accountsEnabled={accountsEnabled}
                        autoDebitEnabled={autoDebitEnabled}
                        remindersProminent={isBillsMode}
                        account={account}
                        vehicle={row.bill.vehicle_id ? vehicleMap[row.bill.vehicle_id] ?? null : null}
                        vehicleColor={row.bill.vehicle_id ? vehicleColorMap[row.bill.vehicle_id] ?? null : null}
                        shortfallNote={
                          shortfall && row.outstanding > 0 && account
                            ? `${account.account_alias} is ${formatCurrency(shortfall, currency)} short`
                            : null
                        }
                        isLockedFreeReminder={row.bill.id === lockedFreeReminderBillId}
                        isPending={pendingIds.has(row.bill.id)}
                        onToggle={() => handleToggle(row.bill.id)}
                        onPartialClick={() => { setToggleError(null); setPartialBill(row.bill); }}
                        onEdit={() => setEditingBill(row.bill)}
                        onDelete={() => setDeletingId(row.bill.id)}
                      />
                    );
                  })}
                </ExpenseGroup>
              );
            })}
          </div>
        </>
      )}

      <CategoriesDialog
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        bills={bills}
        paymentAmountByBillId={paymentAmountByBillId}
        currency={currency}
        categories={categories}
      />

      {addDialogOpen && (
        <BillDialog
          open={addDialogOpen}
          onClose={closeAddDialog}
          onSave={handleAdd}
          initial={{ ...EMPTY_FORM }}
          isPending={isPending}
          accounts={accounts}
          vehicles={vehicles}
          freeReminderUsed={freeReminderUsed}
          lockedFreeReminderBillId={lockedFreeReminderBillId}
        />
      )}

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
