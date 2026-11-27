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
import { invalidateNotificationQueries } from "@/lib/query/notifications";
import { getCurrentPaidMonth, paidMonthName, shiftPaidMonth } from "@/lib/paid-month";
import { formatCurrency, cn } from "@/lib/utils";
import { ContentHeader } from "@/components/app/content-header";
import { CONTENT_HEADER_ACTION_SIZE } from "@/lib/constants/content-header";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import {
  toggleBillPayment,
  markBillPaid,
  addBill,
  updateBill,
  deleteBill,
  setBillSkipped,
  carryOverBill,
  undoBillCarryOver,
  type BillRow as BillRowModel,
  type BillsData,
} from "@/actions/bills";
import { billAmountDue, canCarryOverBill } from "@/lib/planned-expenses/carry-over";
import { CarryOverDialog } from "@/components/dashboard/planned-expenses/carry-over";
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
  summariseByCategory,
  buildAccountCoverage,
  isClosedBucket,
  isFullyPaidBucket,
  matchesLedgerFilter,
  type LedgerFilter,
  type PlannedExpenseRow,
} from "@/lib/planned-expenses/grouping";
import {
  BILL_CARRY_OVER_ERRORS,
  CATEGORY_BREAKDOWN_LIMIT,
  URGENCY_LABELS,
} from "@/lib/constants/planned-expenses";
import { ExpenseRow } from "@/components/dashboard/planned-expenses/expense-row";
import { ExpenseGroup } from "@/components/dashboard/planned-expenses/expense-group";
import { Runway } from "@/components/dashboard/planned-expenses/runway";
import { CoveragePanel } from "@/components/dashboard/planned-expenses/coverage-panel";
import { BillsHero } from "@/components/dashboard/planned-expenses/bills-hero";
import { OttoAnimated } from "@/components/mascot/otto";
import { MASCOT_NAME } from "@/lib/constants/mascot";
import { MonthCalendar } from "@/components/dashboard/planned-expenses/month-calendar";
import { BillsSummaryCards } from "@/components/dashboard/planned-expenses/bills-summary-cards";
import { DayRunway } from "@/components/dashboard/planned-expenses/day-runway";
import { CategoryBreakdown } from "@/components/dashboard/planned-expenses/category-breakdown";
import { BillsLedger, type LedgerDetailColumn } from "@/components/dashboard/planned-expenses/bills-ledger";

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

/** The month's status for an export row. A carried-over bill is skipped, not paid. */
function exportStatus(row: PlannedExpenseRow): string {
  if (row.carryOut) return "Skipped (carried over)";
  return row.amountPaid > 0 ? "Paid" : "Unpaid";
}

function exportBillsToCSV(billRows: PlannedExpenseRow[], categories: CatList): void {
  const headers = ["Name", "Category", "Amount", "Billing Period", "Status"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = billRows.map((row) => [
    esc(row.bill.note ?? getCategoryLabel(row.bill.category_id, categories)),
    esc(getCategoryLabel(row.bill.category_id, categories)),
    row.amountDue,
    row.bill.billing_period,
    exportStatus(row),
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

function exportBillsToExcel(billRows: PlannedExpenseRow[], categories: CatList): void {
  const headers = ["Name", "Category", "Amount", "Billing Period", "Status"];
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headerRow = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const dataRows = billRows.map((row) => {
    const b = row.bill;
    const cells = [
      b.note ?? getCategoryLabel(b.category_id, categories),
      getCategoryLabel(b.category_id, categories),
      String(row.amountDue),
      b.billing_period,
      exportStatus(row),
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
  rows,
  currency,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  rows: PlannedExpenseRow[];
  currency: string;
  categories: CatList;
}) {
  const grouped = useMemo(
    () =>
      summariseByCategory(rows).map(({ categoryId, ...v }) => ({
        id: categoryId,
        label: getCategoryLabel(categoryId, categories),
        ...v,
      })),
    [rows, categories]
  );

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
  // The wide ledger's filter tabs and search. Not persisted: the page opens on everything.
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("all");
  const [ledgerQuery, setLedgerQuery] = useState("");
  // Deliberately not persisted — the panel returns on the next load.
  const [heroDismissed, setHeroDismissed] = useState(false);
  const [editingBill, setEditingBill] = useState<BillRowModel | null>(null);
  const [partialBill, setPartialBill] = useState<BillRowModel | null>(null);
  const [carryRow, setCarryRow] = useState<PlannedExpenseRow | null>(null);
  const [carryError, setCarryError] = useState<string | null>(null);
  const [carryPending, setCarryPending] = useState(false);
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
  const skippedIds = useMemo(
    () => new Set(billsDataQuery.data?.skippedBillIds ?? []),
    [billsDataQuery.data?.skippedBillIds]
  );
  const carriedInByBillId = useMemo(
    () => billsDataQuery.data?.carriedInByBillId ?? {},
    [billsDataQuery.data?.carriedInByBillId]
  );
  const carriedOutByBillId = useMemo(
    () => billsDataQuery.data?.carriedOutByBillId ?? {},
    [billsDataQuery.data?.carriedOutByBillId]
  );
  /** The month a bill viewed here would carry over into, e.g. "2026-12" • "December". */
  const nextMonth = useMemo(() => shiftPaidMonth(paidMonth, 1), [paidMonth]);
  const nextMonthLabel = nextMonth ? paidMonthName(nextMonth) : null;
  const carryTargetFor = (row: PlannedExpenseRow): string | null =>
    canCarryOverBill({
      billingPeriod: row.bill.billing_period,
      endDate: row.bill.end_date,
      outstanding: row.outstanding,
      isCarriedOut: row.carryOut !== null,
      toMonth: nextMonth,
    })
      ? nextMonthLabel
      : null;
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
        carriedInByBillId,
        carriedOutByBillId,
        paidMonth,
      }),
    [bills, paymentAmountByBillId, paidAtByBillId, failedIds, carriedInByBillId, carriedOutByBillId, paidMonth]
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

  // Bills mode opens on the single most urgent unpaid bill; the rest queue behind it.
  // Part-paid bills stay out of it: you have already acted on them, and their balance
  // still shows in the list below. Bills skipped for this month stay out of it too.
  // So do bills auto-debit will pay (full app, wide screens): they only need you once
  // a debit has failed. Bills carried over to next month are done with for this one.
  const unsettled = useMemo(() => rows.filter((r) => !isClosedBucket(r.bucket)), [rows]);
  const unpaid = useMemo(() => unsettled.filter((r) => r.amountPaid <= 0), [unsettled]);
  const needsYou = useMemo(
    () =>
      unpaid.filter((r) => !(autoDebitEnabled && r.bill.is_auto_debit && r.status !== "failed")),
    [unpaid, autoDebitEnabled]
  );
  const heroCandidates = useMemo(
    () => needsYou.filter((r) => !skippedIds.has(r.bill.id)),
    [needsYou, skippedIds]
  );
  const heroSkipped = useMemo(
    () => needsYou.filter((r) => skippedIds.has(r.bill.id)),
    [needsYou, skippedIds]
  );
  const heroRow = heroCandidates[0] ?? null;
  const heroQueue = heroCandidates.slice(1, 4);
  const partPaidCount = unsettled.length - unpaid.length;
  const autoDebitPendingCount = unpaid.length - needsYou.length;

  // ── The ledger, as filtered by the wide layout's tabs and search ───────────
  // Regrouping the filtered rows (rather than filtering inside each group) keeps
  // every heading's count and subtotal true to what it is showing.
  const ledgerSearch = ledgerQuery.trim().toLowerCase();
  const ledgerGroups = useMemo(() => {
    if (ledgerFilter === "all" && !ledgerSearch) return groups;
    return groupPlannedExpenses(
      rows.filter(
        (r) =>
          matchesLedgerFilter(r, ledgerFilter) &&
          (!ledgerSearch ||
            (r.bill.note ?? "").toLowerCase().includes(ledgerSearch) ||
            getCategoryLabel(r.bill.category_id, categories).toLowerCase().includes(ledgerSearch))
      )
    );
  }, [groups, rows, ledgerFilter, ledgerSearch, categories]);
  const ledgerCounts = useMemo(
    (): Record<LedgerFilter, number> => ({
      all: rows.length,
      unpaid: unsettled.length,
      // Not rows minus unsettled: carried-over bills are in neither tab.
      paid: rows.filter((r) => isFullyPaidBucket(r.bucket)).length,
    }),
    [rows, unsettled.length]
  );
  const ledgerEmptyMessage =
    ledgerGroups.length > 0
      ? null
      : ledgerSearch
        ? `No bills match “${ledgerQuery.trim()}”.`
        : ledgerFilter === "paid"
          ? "Nothing paid yet this month."
          : "Nothing left to pay this month.";
  // Settled only folds away when you are browsing everything; filtering to Paid or
  // searching is asking to see those rows.
  const settledCanCollapse = ledgerFilter === "all" && !ledgerSearch;
  const detailColumn: LedgerDetailColumn = isBillsMode ? "reminder" : accountsEnabled ? "account" : null;

  const categoryItems = useMemo(
    () =>
      summariseByCategory(rows).map((s) => ({
        id: s.categoryId,
        label: getCategoryLabel(s.categoryId, categories),
        color: getCategoryDotColor(categories.find((c) => c.id === s.categoryId)?.bgClass ?? ""),
        total: s.total,
        paid: s.paid,
        count: s.count,
      })),
    [rows, categories]
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.billData(paidMonth) });
    invalidateNotificationQueries(queryClient);
  }

  /** A carry-over changes this month and the next, so both cached months go stale. */
  function invalidateCarryMonths() {
    invalidate();
    if (nextMonth) queryClient.invalidateQueries({ queryKey: queryKeys.billData(nextMonth) });
  }

  function openCarryOver(row: PlannedExpenseRow) {
    setToggleError(null);
    setCarryError(null);
    setCarryRow(row);
  }

  async function handleCarryOver(note: string) {
    if (!carryRow) return;
    const billId = carryRow.bill.id;
    setCarryPending(true);
    setCarryError(null);
    const res = await carryOverBill(billId, paidMonth, note);
    setCarryPending(false);
    if (res.error || !res.carryOver) {
      setCarryError(BILL_CARRY_OVER_ERRORS[res.error ?? ""] ?? res.error ?? "Couldn't carry that bill over. Try again.");
      return;
    }
    const carryOut = res.carryOver;
    // Move the row into Carried at once; the refetch below confirms it.
    queryClient.setQueryData<BillsData | null>(queryKeys.billData(paidMonth), (old) =>
      old ? { ...old, carriedOutByBillId: { ...old.carriedOutByBillId, [billId]: carryOut } } : old
    );
    setCarryRow(null);
    invalidateCarryMonths();
  }

  /** Optimistic: the bill is due here again at once, and rolls back if the undo is refused. */
  async function handleUndoCarryOver(billId: string) {
    const queryKey = queryKeys.billData(paidMonth);
    const snapshot = queryClient.getQueryData(queryKey);
    queryClient.setQueryData<BillsData | null>(queryKey, (old) => {
      if (!old) return old;
      const next = { ...old.carriedOutByBillId };
      delete next[billId];
      return { ...old, carriedOutByBillId: next };
    });
    setToggleError(null);
    setPendingIds((prev) => new Set(prev).add(billId));
    const res = await undoBillCarryOver(billId, paidMonth);
    setPendingIds((prev) => { const s = new Set(prev); s.delete(billId); return s; });
    if (res.error) {
      queryClient.setQueryData(queryKey, snapshot);
      setToggleError({
        kind: "generic",
        message: BILL_CARRY_OVER_ERRORS[res.error] ?? "Couldn't undo that carry-over. Try again.",
      });
      return;
    }
    invalidateCarryMonths();
  }

  /** Optimistic: the panel moves on (or back) at once and rolls back if the save fails. */
  async function handleSetSkipped(billId: string, skipped: boolean) {
    const queryKey = queryKeys.billData(paidMonth);
    const snapshot = queryClient.getQueryData(queryKey);
    queryClient.setQueryData<BillsData | null>(queryKey, (old) => {
      if (!old) return old;
      const rest = (old.skippedBillIds ?? []).filter((id) => id !== billId);
      return { ...old, skippedBillIds: skipped ? [...rest, billId] : rest };
    });
    setToggleError(null);
    const res = await setBillSkipped(billId, paidMonth, skipped);
    if (res.error) {
      queryClient.setQueryData(queryKey, snapshot);
      setToggleError({
        kind: "generic",
        message: skipped ? "Couldn't skip that bill. Try again." : "Couldn't bring that bill back. Try again.",
      });
    }
  }

  async function handleToggle(billId: string) {
    const queryKey = queryKeys.billData(paidMonth);
    const snapshot = queryClient.getQueryData(queryKey);

    queryClient.setQueryData<BillsData | null>(queryKey, (old) => {
      if (!old) return old;
      const wasPaid = old.paidBillIds.includes(billId);
      const bill = old.bills.find((b) => b.id === billId);
      // The server pays the month's full amount, carried-in balance included.
      const billAmount = bill ? billAmountDue(bill, old.carriedInByBillId) : 0;
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
        setToggleError({ kind: "generic", message: BILL_CARRY_OVER_ERRORS[res.error] ?? res.error });
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
      setToggleError({ kind: "generic", message: BILL_CARRY_OVER_ERRORS[res.error] ?? res.error });
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
        form.notes,
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
        form.notes,
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

  /** The month picker sits above the list on smaller screens and in the header on wide ones. */
  function renderMonthSelect(placement: "toolbar" | "header") {
    return (
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        {/* ring-offset-0 matters: the primitive sets ring-offset-2, and with ring-0
            that offset still paints a stray 2px shadow on focus. */}
        <SelectTrigger
          className={cn(
            "w-auto gap-1.5 text-sm font-medium focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 [&>svg]:opacity-60",
            placement === "toolbar"
              ? "h-10 border-0 bg-transparent px-2 shadow-none hover:bg-muted"
              : cn("px-3.5", CONTENT_HEADER_ACTION_SIZE.controlClass),
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align={placement === "toolbar" ? "start" : "end"}>
          {monthOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="container max-w-3xl space-y-4 px-4 py-6 xl:max-w-[88rem] xl:px-8">
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
            <div className="hidden xl:block">{renderMonthSelect("header")}</div>
            {isFeatureEnabled("expenses") ? (
              <Button variant="outline" size={CONTENT_HEADER_ACTION_SIZE.button} aria-label="Categories" asChild>
                <Link href="/dashboard/expenses/categories">
                  <LayoutGrid className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Categories</span>
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size={CONTENT_HEADER_ACTION_SIZE.button}
                aria-label="Categories"
                onClick={() => setCategoriesOpen(true)}
              >
                <LayoutGrid className="size-4" aria-hidden />
                <span className="hidden sm:inline">Categories</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={CONTENT_HEADER_ACTION_SIZE.button} className="gap-1.5">
                  <Download className="size-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportBillsToCSV(rows, categories)}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBillsToExcel(rows, categories)}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setAddOpen(true)} size={CONTENT_HEADER_ACTION_SIZE.button} className="hidden gap-1.5 xl:inline-flex">
              <Plus className="size-4" />
              Add bill
            </Button>
          </div>
        }
      />

      {/* Month + add — on wide screens both live in the header instead. */}
      <div className="flex items-center justify-between gap-2 xl:hidden">
        {renderMonthSelect("toolbar")}
        <Button onClick={() => setAddOpen(true)} size="lg" className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {billsDataQuery.isPending ? (
        <DashboardSkeleton variant="form" />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <OttoAnimated pose="think" size={150} />
          <p className="text-base font-semibold text-foreground">No bills this month</p>
          <p className="max-w-[36ch] text-sm">
            Add the bills you pay each month. {MASCOT_NAME} will remind you before each one is due.
          </p>
        </div>
      ) : (
        <>
          {/* ── Wide screens: the month in four numbers, then day by day ── */}
          <div className="hidden space-y-3.5 xl:block">
            <BillsSummaryCards
              summary={summary}
              groups={groups}
              currency={currency}
              monthLabel={monthMeta.monthLabel}
            />
            <DayRunway
              rows={rows}
              currency={currency}
              monthLabel={monthMeta.monthLabel}
              year={monthMeta.year}
              month0={monthMeta.month0}
              todayDay={monthMeta.todayDay}
            />
          </div>

          {/* Below xl this is one column: the panels stack above the list in the order
              they always have. From xl the panels become a rail to the right of the list. */}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
            <aside
              aria-label={`${monthMeta.monthLabel} at a glance`}
              className="flex min-w-0 flex-col gap-4 xl:col-start-2 xl:row-start-1"
            >
              {/* Bills mode leads with this panel on every screen. The full app shows
                  it only in the wide rail, where it has room of its own. */}
              {!heroDismissed && (
                <div className={cn(!isBillsMode && "hidden xl:block")}>
                  <BillsHero
                    onDismiss={() => setHeroDismissed(true)}
                    next={heroRow}
                    queue={heroQueue}
                    skipped={heroSkipped}
                    partPaidCount={partPaidCount}
                    autoDebitPendingCount={autoDebitPendingCount}
                    currency={currency}
                    isPending={heroRow ? pendingIds.has(heroRow.bill.id) : false}
                    onMarkPaid={() => heroRow && handleToggle(heroRow.bill.id)}
                    onPartialPayment={() => {
                      if (!heroRow) return;
                      setToggleError(null);
                      setPartialBill(heroRow.bill);
                    }}
                    onEdit={() => heroRow && setEditingBill(heroRow.bill)}
                    onSkip={() => heroRow && handleSetSkipped(heroRow.bill.id, true)}
                    onUnskip={(billId) => handleSetSkipped(billId, false)}
                    carryTargetLabel={heroRow ? carryTargetFor(heroRow) : null}
                    onCarryOver={() => heroRow && openCarryOver(heroRow)}
                  />
                </div>
              )}
              {/* The day-by-day runway above replaces these on wide screens. */}
              {isBillsMode ? (
                <div className="xl:hidden">
                  <MonthCalendar
                    rows={rows}
                    summary={summary}
                    currency={currency}
                    monthLabel={monthMeta.monthLabel}
                    year={monthMeta.year}
                    month0={monthMeta.month0}
                    todayDay={monthMeta.todayDay}
                  />
                </div>
              ) : (
                <div className="xl:hidden">
                  <Runway
                    rows={rows}
                    summary={summary}
                    currency={currency}
                    monthLabel={monthMeta.monthLabel}
                    daysInMonth={monthMeta.daysInMonth}
                    todayDay={monthMeta.todayDay}
                  />
                </div>
              )}
              {!isBillsMode && coverage.length > 0 && <CoveragePanel coverage={coverage} currency={currency} />}
              <CategoryBreakdown
                className="hidden xl:block"
                items={categoryItems.slice(0, CATEGORY_BREAKDOWN_LIMIT)}
                moreCount={Math.max(0, categoryItems.length - CATEGORY_BREAKDOWN_LIMIT)}
                onShowAll={() => setCategoriesOpen(true)}
                currency={currency}
              />
            </aside>

            <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-1">
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
              <BillsLedger
                filter={ledgerFilter}
                onFilterChange={setLedgerFilter}
                counts={ledgerCounts}
                query={ledgerQuery}
                onQueryChange={setLedgerQuery}
                detailColumn={detailColumn}
                emptyMessage={ledgerEmptyMessage}
              >
                {ledgerGroups.map((group) => {
                  const isSettled = group.bucket === "settled";
                  const label =
                    group.bucket === "later"
                      ? `Later in ${monthMeta.monthLabel}`
                      : group.bucket === "carried" && nextMonthLabel
                        ? `Carried to ${nextMonthLabel}`
                        : URGENCY_LABELS[group.bucket][labelVariant];
                  return (
                    <ExpenseGroup
                      key={group.bucket}
                      bucket={group.bucket}
                      label={label}
                      count={group.rows.length}
                      subtotal={group.subtotal}
                      currency={currency}
                      collapsible={isSettled && settledCanCollapse}
                      collapsed={isSettled && settledCanCollapse && settledCollapsed}
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
                            detailColumn={detailColumn}
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
                            carryTargetLabel={carryTargetFor(row)}
                            onToggle={() => handleToggle(row.bill.id)}
                            onPartialClick={() => { setToggleError(null); setPartialBill(row.bill); }}
                            onCarryOver={() => openCarryOver(row)}
                            onUndoCarryOver={() => handleUndoCarryOver(row.bill.id)}
                            onEdit={() => setEditingBill(row.bill)}
                            onDelete={() => setDeletingId(row.bill.id)}
                          />
                        );
                      })}
                    </ExpenseGroup>
                  );
                })}
              </BillsLedger>
            </div>
          </div>
        </>
      )}

      <CategoriesDialog
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        rows={rows}
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
          billAmount={billAmountDue(partialBill, carriedInByBillId)}
          alreadyPaid={paymentAmountByBillId[partialBill.id] ?? 0}
          onSubmit={handlePartialSubmit}
          isPending={isPending}
        />
      )}

      {carryRow && nextMonth && (
        <CarryOverDialog
          open={!!carryRow}
          onClose={() => setCarryRow(null)}
          billLabel={carryRow.bill.note ?? getCategoryLabel(carryRow.bill.category_id, categories)}
          billAmount={carryRow.bill.amount}
          outstanding={carryRow.outstanding}
          fromMonth={paidMonth}
          toMonth={nextMonth}
          currency={currency}
          onSubmit={handleCarryOver}
          isPending={carryPending}
          error={carryError}
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
