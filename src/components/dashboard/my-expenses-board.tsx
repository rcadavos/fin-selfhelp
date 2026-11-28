"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Download, LayoutGrid, Plus, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteExpense, type ExpenseEntryRow } from "@/actions/budget";
import { type AccountRow } from "@/actions/accounts";
import { useUser } from "@/hooks/use-user";
import {
  expenseDataQueryOptions,
  monthlyBreakdownQueryOptions,
  EXPENSE_PAYMENT_HISTORY_MONTHS,
} from "@/lib/query/expenses";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { accountsQueryOptions } from "@/lib/query/accounts";
import {
  vehiclesQueryOptions,
  buildVehicleColorMap,
  invalidateVehicleQueriesIfTransportAffected,
} from "@/lib/query/vehicles";
import { userPreferencesQueryOptions } from "@/lib/query/user-preferences-query";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth, paidMonthName } from "@/lib/paid-month";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { formatCurrency, roundToCents } from "@/lib/utils";
import { TAILWIND_DOT_COLORS } from "@/lib/constants/tailwind-dot-colors";
import {
  BUSY_DAY_MIN_ELAPSED_DAYS,
  EXPENSE_ACCOUNT_FILTER,
  INITIAL_EXPENSE_DAY_GROUPS,
} from "@/lib/constants/expenses";
import { ContentHeader } from "../app/content-header";
import { CONTENT_HEADER_ACTION_SIZE } from "@/lib/constants/content-header";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { MonthStepper } from "@/components/app/month-stepper";
import { AddEntryPanel } from "@/components/dashboard/add-entry-panel";
import { EditExpenseDialog } from "@/components/dashboard/expense/edit-expense-dialog";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import {
  entriesForMonth,
  buildExpenseDayGroups,
  buildCategoryTotals,
  buildCumulativeSpend,
  summariseSpendingPace,
  matchesExpenseSearch,
  isLargeEntry,
} from "@/lib/expenses/pace";
import { SpendingPacePanel } from "@/components/dashboard/expenses/spending-pace";
import { CategoryBreakdown } from "@/components/dashboard/expenses/category-breakdown";
import {
  ExpenseFilters,
  type ExpenseAccountOption,
} from "@/components/dashboard/expenses/expense-filters";
import {
  ExpenseLedger,
  formatDayRange,
  type HiddenDaysSummary,
} from "@/components/dashboard/expenses/expense-ledger";

type CatList = Array<{ id: string; label: string; bgClass: string }>;

function colorFromBgClass(bgClass: string): string {
  const m = bgClass.match(/bg-([a-z]+)-/);
  return (m && TAILWIND_DOT_COLORS[m[1]]) ?? "#9ca3af";
}

function getCategoryColor(id: string, categories: CatList): string {
  const cat = categories.find((c) => c.id === id);
  return cat?.bgClass ? colorFromBgClass(cat.bgClass) : "#9ca3af";
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
    const name = getEntryName(e, categories);
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
    const name = getEntryName(e, categories);
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

// ─── Board ────────────────────────────────────────────────────────────────────

export function MyExpensesBoard() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentPaidMonth());
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string>(EXPENSE_ACCOUNT_FILTER.all);
  const [largeOnly, setLargeOnly] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntryRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  const expenseDataQuery = useQuery(expenseDataQueryOptions(selectedMonth));
  // Already fetched for the dashboard's six-month chart, so the pace comparison
  // costs nothing extra.
  const breakdownQuery = useQuery(monthlyBreakdownQueryOptions(EXPENSE_PAYMENT_HISTORY_MONTHS));
  const prefsQuery = useQuery(userPreferencesQueryOptions(user?.id));
  const { data: dbCategories } = useSuspenseQuery(categoriesQueryOptions());
  const accountsQuery = useQuery(accountsQueryOptions());
  const vehiclesQuery = useQuery(vehiclesQueryOptions());

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const vehicles = useMemo(() => vehiclesQuery.data ?? [], [vehiclesQuery.data]);
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])) as Record<string, AccountRow>,
    [accounts]
  );
  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles]);
  const vehicleColorMap = useMemo(() => buildVehicleColorMap(vehicles), [vehicles]);
  const categories: CatList = dbCategories ?? [];
  const currency = prefsQuery.data?.currency ?? DEFAULT_USER_PREFERENCES.currency;
  const paidMonth = selectedMonth;

  const allEntries: ExpenseEntryRow[] = useMemo(
    () => expenseDataQuery.data?.entries ?? [],
    [expenseDataQuery.data?.entries]
  );

  // ── Derived board model ────────────────────────────────────────────────────
  const monthEntries = useMemo(
    () => entriesForMonth(allEntries, selectedMonth),
    [allEntries, selectedMonth]
  );
  // The pace reads the whole month, never the filtered view — otherwise picking a
  // category would make it look like you were suddenly under budget.
  const pace = useMemo(
    () =>
      summariseSpendingPace({
        entries: monthEntries,
        monthYm: selectedMonth,
        breakdown: breakdownQuery.data ?? [],
      }),
    [monthEntries, selectedMonth, breakdownQuery.data]
  );
  const categoryTotals = useMemo(
    () => buildCategoryTotals(monthEntries, categories),
    [monthEntries, categories]
  );

  const cumulativeSpend = useMemo(
    () => buildCumulativeSpend(monthEntries, pace.dayOfMonth),
    [monthEntries, pace.dayOfMonth]
  );

  // Only the accounts that paid for something this month, so every choice narrows the list.
  const accountOptions: ExpenseAccountOption[] = useMemo(() => {
    const used = new Map<string, string>();
    let hasUnassigned = false;
    for (const entry of monthEntries) {
      if (!entry.account_id) {
        hasUnassigned = true;
        continue;
      }
      if (!used.has(entry.account_id)) {
        used.set(entry.account_id, accountMap[entry.account_id]?.account_alias ?? "Deleted account");
      }
    }
    const options = Array.from(used, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    if (hasUnassigned) options.push({ value: EXPENSE_ACCOUNT_FILTER.none, label: "No account" });
    return options;
  }, [monthEntries, accountMap]);

  // Deleting entries can take an account off the list, or hide the picker altogether.
  // Never leave a filter applied that the user can no longer see or clear.
  const activeAccountFilter =
    accountOptions.length > 1 && accountOptions.some((o) => o.value === accountFilter)
      ? accountFilter
      : EXPENSE_ACCOUNT_FILTER.all;

  const largeCount = useMemo(
    () => monthEntries.filter((e) => isLargeEntry(e.amount, pace.largeThreshold)).length,
    [monthEntries, pace.largeThreshold]
  );

  const filteredEntries = useMemo(
    () =>
      monthEntries.filter((entry) => {
        if (activeCategoryId !== null && (entry.category_id || "") !== activeCategoryId) return false;
        if (activeAccountFilter === EXPENSE_ACCOUNT_FILTER.none && entry.account_id) return false;
        if (
          activeAccountFilter !== EXPENSE_ACCOUNT_FILTER.all &&
          activeAccountFilter !== EXPENSE_ACCOUNT_FILTER.none &&
          entry.account_id !== activeAccountFilter
        ) {
          return false;
        }
        if (largeOnly && !isLargeEntry(entry.amount, pace.largeThreshold)) return false;
        return matchesExpenseSearch(
          entry,
          getEntryName(entry, categories),
          getCategoryLabel(entry.category_id, categories),
          search
        );
      }),
    [monthEntries, activeCategoryId, activeAccountFilter, largeOnly, pace.largeThreshold, search, categories]
  );
  const dayGroups = useMemo(() => buildExpenseDayGroups(filteredEntries), [filteredEntries]);

  const isCurrentMonth = selectedMonth === getCurrentPaidMonth();
  const isFiltered =
    activeCategoryId !== null ||
    activeAccountFilter !== EXPENSE_ACCOUNT_FILTER.all ||
    largeOnly ||
    search.trim().length > 0;

  // A filter is a search: show every match. Otherwise the latest days, with the rest folded.
  const isCollapsed = !isFiltered && !showAllDays && dayGroups.length > INITIAL_EXPENSE_DAY_GROUPS;
  const visibleDayGroups = isCollapsed ? dayGroups.slice(0, INITIAL_EXPENSE_DAY_GROUPS) : dayGroups;
  const hiddenDays: HiddenDaysSummary | null = useMemo(() => {
    if (!isCollapsed) return null;
    const rest = dayGroups.slice(INITIAL_EXPENSE_DAY_GROUPS);
    return {
      label: formatDayRange(rest[rest.length - 1].dateYmd, rest[0].dateYmd),
      entryCount: rest.reduce((sum, g) => sum + g.entries.length, 0),
      total: roundToCents(rest.reduce((sum, g) => sum + g.total, 0)),
    };
  }, [isCollapsed, dayGroups]);

  // A filtered day total is only part of the day, so comparing it to the average would mislead.
  const busyAverage =
    !isFiltered && pace.dayOfMonth >= BUSY_DAY_MIN_ELAPSED_DAYS && pace.dailyAverage > 0
      ? pace.dailyAverage
      : null;

  const daysLeft = pace.daysInMonth - pace.dayOfMonth;
  const monthNote = isCurrentMonth
    ? `Day ${pace.dayOfMonth} of ${pace.daysInMonth} • ${
        daysLeft === 0 ? "last day" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
      }`
    : `${pace.entryCount} ${pace.entryCount === 1 ? "entry" : "entries"}`;

  function changeMonth(month: string) {
    setSelectedMonth(month);
    // Another month has other categories and accounts, so filters picked here may match nothing there.
    setActiveCategoryId(null);
    setAccountFilter(EXPENSE_ACCOUNT_FILTER.all);
    setLargeOnly(false);
    setShowAllDays(false);
  }

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenseData(paidMonth) });
  }, [queryClient, paidMonth]);

  function handleDeleteConfirm() {
    const id = deletingId;
    if (!id) return;
    startTransition(async () => {
      const entry = allEntries.find((e) => e.id === id);
      const res = await deleteExpense(id);
      if (res.error) setError(res.error);
      else {
        invalidate();
        invalidateVehicleQueriesIfTransportAffected(queryClient, entry?.category_id);
      }
    });
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-5 px-4 py-6">
      <ContentHeader
        className="mb-0"
        title="Expenses"
        subtitle="Everything you've spent this month, and whether it's more than usual."
        icon={Banknote}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size={CONTENT_HEADER_ACTION_SIZE.button} aria-label="Categories" asChild>
              <Link href="/dashboard/expenses/categories">
                <LayoutGrid className="size-4" aria-hidden />
                <span className="hidden sm:inline">Categories</span>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size={CONTENT_HEADER_ACTION_SIZE.button}
                  className="gap-1.5"
                  aria-label="Export"
                >
                  <Download className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportBoardToCSV(monthEntries, categories)}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBoardToExcel(monthEntries, categories)}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size={CONTENT_HEADER_ACTION_SIZE.button} onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="size-4" aria-hidden />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add expense</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <MonthStepper value={selectedMonth} options={monthOptions} onChange={changeMonth} />
        {/* On a phone the day count moves into the pace panel. */}
        {!expenseDataQuery.isPending && (
          <p className="hidden font-mono text-xs tracking-[0.04em] text-muted-foreground sm:block">{monthNote}</p>
        )}
      </div>

      {error && (
        <div className="surface flex items-center justify-between border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss"
            className="tap-target ml-3 rounded-full p-0.5 hover:bg-destructive/10"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {expenseDataQuery.isPending ? (
        <DashboardSkeleton variant="form" />
      ) : (
        <>
          <SpendingPacePanel
            pace={pace}
            series={cumulativeSpend}
            monthYm={selectedMonth}
            currency={currency}
            isCurrentMonth={isCurrentMonth}
          />

          {monthEntries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No expenses this month. Add one to get started.
            </p>
          ) : (
            <>
              <CategoryBreakdown
                totals={categoryTotals}
                colorFor={(id) => getCategoryColor(id, categories)}
                monthTotal={pace.spent}
                entryCount={pace.entryCount}
                currency={currency}
                activeId={activeCategoryId}
                onSelect={setActiveCategoryId}
              />

              <div className="space-y-2">
                <ExpenseFilters
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder={`Search ${paidMonthName(selectedMonth)}…`}
                  accountOptions={accountOptions}
                  accountValue={activeAccountFilter}
                  onAccountChange={setAccountFilter}
                  showLargeFilter={largeCount > 0 && largeCount < monthEntries.length}
                  largeOnly={largeOnly}
                  onLargeOnlyChange={setLargeOnly}
                />
                {isFiltered && (
                  <p className="text-xs text-muted-foreground">
                    {filteredEntries.length} of {monthEntries.length} shown <span aria-hidden>•</span>{" "}
                    {formatCurrency(
                      roundToCents(filteredEntries.reduce((sum, e) => sum + e.amount, 0)),
                      currency
                    )}
                  </p>
                )}
              </div>

              {dayGroups.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Nothing matches that.</p>
              ) : (
                <ExpenseLedger
                  groups={visibleDayGroups}
                  hidden={hiddenDays}
                  onShowEarlier={() => setShowAllDays(true)}
                  busyAverage={busyAverage}
                  currency={currency}
                  largeThreshold={pace.largeThreshold}
                  nameFor={(entry) => getEntryName(entry, categories)}
                  categoryLabelFor={(id) => getCategoryLabel(id, categories)}
                  colorFor={(id) => getCategoryColor(id, categories)}
                  accountMap={accountMap}
                  vehicleMap={vehicleMap}
                  vehicleColorMap={vehicleColorMap}
                  onEdit={setEditingEntry}
                  onDelete={setDeletingId}
                />
              )}
            </>
          )}
        </>
      )}

      <AddEntryPanel open={addOpen} onClose={() => setAddOpen(false)} />
      <EditExpenseDialog
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onDelete={setDeletingId}
      />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete expense?"
        description="This permanently deletes the expense."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
