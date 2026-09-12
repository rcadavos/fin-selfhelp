"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Download, LayoutGrid, Plus, Search, X } from "lucide-react";
import Link from "next/link";
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
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";
import { TAILWIND_DOT_COLORS } from "@/lib/constants/tailwind-dot-colors";
import { ContentHeader } from "../app/content-header";
import { AddEntryPanel } from "@/components/dashboard/add-entry-panel";
import { EditExpenseDialog } from "@/components/dashboard/expense/edit-expense-dialog";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import {
  entriesForMonth,
  buildExpenseDayGroups,
  buildCategoryTotals,
  summariseSpendingPace,
  matchesExpenseSearch,
} from "@/lib/expenses/pace";
import { SpendingPacePanel } from "@/components/dashboard/expenses/spending-pace";
import { CategoryFilterStrip } from "@/components/dashboard/expenses/category-filter-strip";
import { ExpenseDayGroupCard } from "@/components/dashboard/expenses/expense-day-group";

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
  const [addOpen, setAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntryRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const filteredEntries = useMemo(
    () =>
      monthEntries.filter((entry) => {
        if (activeCategoryId !== null && (entry.category_id || "") !== activeCategoryId) return false;
        return matchesExpenseSearch(
          entry,
          getEntryName(entry, categories),
          getCategoryLabel(entry.category_id, categories),
          search
        );
      }),
    [monthEntries, activeCategoryId, search, categories]
  );
  const dayGroups = useMemo(() => buildExpenseDayGroups(filteredEntries), [filteredEntries]);
  const maxDayTotal = useMemo(
    () => dayGroups.reduce((max, g) => Math.max(max, g.total), 0),
    [dayGroups]
  );

  const isCurrentMonth = selectedMonth === getCurrentPaidMonth();
  const isFiltered = activeCategoryId !== null || search.trim().length > 0;

  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenseData(paidMonth) });
  }, [queryClient, paidMonth]);

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

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <ContentHeader
        title="Expenses"
        subtitle="Everything you've spent this month."
        icon={Banknote}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" aria-label="Categories" asChild>
              <Link href="/dashboard/expenses/categories">
                <LayoutGrid className="size-4" aria-hidden />
                <span className="hidden sm:inline">Categories</span>
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="size-3.5" />
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
          </div>
        }
      />

      {/* Month + add */}
      <div className="flex items-center justify-between gap-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
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
        <Button size="lg" onClick={() => setAddOpen(true)} className="shrink-0 gap-1.5">
          <Plus className="size-4" aria-hidden />
          Add
        </Button>
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
      ) : monthEntries.length === 0 ? (
        <>
          <SpendingPacePanel pace={pace} currency={currency} isCurrentMonth={isCurrentMonth} />
          <p className="py-10 text-center text-sm text-muted-foreground">
            No expenses this month. Add one to get started.
          </p>
        </>
      ) : (
        <>
          <SpendingPacePanel pace={pace} currency={currency} isCurrentMonth={isCurrentMonth} />

          <CategoryFilterStrip
            totals={categoryTotals}
            colorFor={(id) => getCategoryColor(id, categories)}
            monthTotal={pace.spent}
            currency={currency}
            activeId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />

          <div className="surface flex h-10 items-center gap-2 border border-border bg-card px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this month…"
              aria-label="Search expenses"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="tap-target shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {isFiltered && (
            <p className="-mt-1 text-[11.5px] text-muted-foreground">
              {filteredEntries.length} of {monthEntries.length} shown ·{" "}
              {formatCurrency(
                filteredEntries.reduce((sum, e) => sum + e.amount, 0),
                currency
              )}
            </p>
          )}

          {dayGroups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing matches that.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {dayGroups.map((group) => (
                <ExpenseDayGroupCard
                  key={group.dateYmd}
                  group={group}
                  maxDayTotal={maxDayTotal}
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
              ))}
            </div>
          )}
        </>
      )}

      <AddEntryPanel open={addOpen} onClose={() => setAddOpen(false)} />
      <EditExpenseDialog
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onDelete={setDeletingId}
      />

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete expense?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the expense.</p>
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
