"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { StatusFilterDropdown } from "@/components/ui/status-filter-dropdown";
import { addExpense, updateExpense, deleteExpense } from "@/actions/budget";
import { toggleExpensePayment, type PaymentMonthStats } from "@/actions/expense-payments";
import { useUser } from "@/hooks/use-user";
import { useBudgetRefresh } from "@/contexts/budget-refresh";
import type { ReminderDay } from "@/types/database.types";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import type { ExpenseData, ExpenseEntryRow } from "@/actions/budget";
import {
  effectiveDueDateInPaidMonth,
  formatReminderDateList,
  formatYmdLocal,
} from "@/lib/expense-due-date";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { billsDataQueryOptions } from "@/lib/query/bills";
import {
  EXPENSE_PAYMENT_HISTORY_MONTHS,
  expenseDataQueryOptions,
  expensePaymentHistoryQueryOptions,
  monthlyBreakdownQueryOptions,
} from "@/lib/query/expenses";
import { queryKeys } from "@/lib/query/keys";
import { subscriptionPlanQueryOptions } from "@/lib/query/subscription-plan";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";
import { getAccountDisplayName } from "@/components/app/account-dropdown-menu";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ContentHeader } from "@/components/app/content-header";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { DatePicker, parseYmdToLocalDate } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import {
  DEFAULT_USER_PREFERENCES,
  formatDateWithPreferences,
} from "@/lib/user-preferences";
import {
  readExpensesCategorizedPreference,
  writeExpensesCategorizedPreference,
} from "@/lib/expenses-categorized-preference";
import {
  parseExpenseCadenceTypeParam,
  type ExpenseCadenceTypeParam,
} from "@/lib/expense-cadence-type";
import {
  Plus,
  Trash2,
  Check,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  CircleDollarSign,
  Receipt,
  Banknote,
  LayoutDashboard,
  CalendarRange,
  MoreHorizontal,
  Loader2,
  Pencil,
  XCircle,
  Clock,
  Undo2,
  Coins as GoldCoin,
  Gem,
  Share,
} from "lucide-react";
import { HoverPopover } from "@/components/ui/hover-popover";

const REMINDER_DAY_SORT_ORDER: ReminderDay[] = [3, 1, 0];
const STATUS_SORT_ORDER: ExpensePayStatus[] = ["unpaid", "outstanding", "paid"];

function reminderKeyFromDays(days: ReminderDay[]): string {
  const normalized = [
    ...new Set(days.filter((d): d is ReminderDay => d === 0 || d === 1 || d === 3)),
  ];
  if (normalized.length === 0) return "";
  normalized.sort(
    (a, b) => REMINDER_DAY_SORT_ORDER.indexOf(a) - REMINDER_DAY_SORT_ORDER.indexOf(b)
  );
  return normalized.join(",");
}

function daysFromReminderKey(key: string): ReminderDay[] {
  if (!key) return [];
  const out: ReminderDay[] = [];
  for (const part of key.split(",")) {
    const n = Number(part);
    if (n === 0 || n === 1 || n === 3) out.push(n);
  }
  return [...new Set(out)];
}

const EDIT_REMINDER_NONE = "__none__";

/** Select sentinel for optional expense category (stored as empty string in DB). */
const CATEGORY_SELECT_NONE = "__no_category__";

const EDIT_REMINDER_SELECT_ITEMS: { value: string; label: string }[] = [
  { value: EDIT_REMINDER_NONE, label: "None" },
  { value: "3", label: "3 days before" },
  { value: "1", label: "1 day before" },
  { value: "0", label: "On due date" },
  { value: "3,1", label: "3 days before and 1 day before" },
  { value: "3,0", label: "3 days before and on due date" },
  { value: "1,0", label: "1 day before and on due date" },
  { value: "3,1,0", label: "All reminders" },
];

const REMINDER_CHANNEL_ITEMS = [
  { value: "email", label: "Remind by Email" },
  { value: "in-app", label: "In-App Notification" },
  { value: "both", label: "Both Email & In-App" },
];

function reminderSelectValueFromDays(days: ReminderDay[]): string {
  if (days.length === 0) return EDIT_REMINDER_NONE;
  const k = reminderKeyFromDays(days);
  return EDIT_REMINDER_SELECT_ITEMS.some((i) => i.value === k) ? k : EDIT_REMINDER_NONE;
}

function groupEntriesByCategory(entries: ExpenseEntryRow[]) {
  const map = new Map<string, ExpenseEntryRow[]>();
  for (const entry of entries) {
    const list = map.get(entry.category_id) ?? [];
    list.push(entry);
    map.set(entry.category_id, list);
  }
  return map;
}

function sortedCategoryGroupsFromEntries(
  entryList: ExpenseEntryRow[],
  orderedCategoryIds: string[],
  getStatus?: (entry: ExpenseEntryRow) => ExpensePayStatus
): [string, ExpenseEntryRow[]][] {
  const g = groupEntriesByCategory(entryList);
  const pairs = Array.from(g.entries());
  const uncategorized = pairs.find(([id]) => id === "");
  const rest = pairs.filter(([id]) => id !== "");
  rest.sort((a, b) => {
    const ai = orderedCategoryIds.indexOf(a[0]);
    const bi = orderedCategoryIds.indexOf(b[0]);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a[0].localeCompare(b[0]);
  });
  const groups = uncategorized ? [...rest, uncategorized] : rest;
  if (!getStatus) return groups;
  return groups.map(([id, groupEntries]) => [
    id,
    [...groupEntries].sort(
      (a, b) => STATUS_SORT_ORDER.indexOf(getStatus(a)) - STATUS_SORT_ORDER.indexOf(getStatus(b))
    ),
  ]);
}

function getCategoryLabel(categories: { id: string; label: string }[], id: string): string {
  if (!id) return "Uncategorized";
  return categories.find((c) => c.id === id)?.label ?? id;
}

function getCategoryBg(categories: { id: string; bgClass: string }[], id: string): string {
  return categories.find((c) => c.id === id)?.bgClass ?? "";
}

function exportToCSV(rows: DesktopExpenseRow[], categories: { id: string; label: string }[]): void {
  const headers = ["Name", "Category", "Amount", "Status", "Due Date", "Reminders"];
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => {
      const category = getCategoryLabel(categories, row.entry.category_id);
      return [
        `"${row.displayName.replace(/"/g, '""')}"`,
        `"${category.replace(/"/g, '""')}"`,
        row.entry.amount.toString(),
        row.status,
        row.dueText || "",
        `"${row.reminderText.replace(/"/g, '""')}"`,
      ].join(",");
    }),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `expenses-${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportToExcel(rows: DesktopExpenseRow[], categories: { id: string; label: string }[]): void {
  const headers = ["Name", "Category", "Amount", "Status", "Due Date", "Reminders"];
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headerRow = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const dataRows = rows
    .map((row) => {
      const cells = [
        row.displayName,
        getCategoryLabel(categories, row.entry.category_id),
        row.entry.amount.toString(),
        row.status,
        row.dueText || "",
        row.reminderText,
      ]
        .map((v) => `<td>${esc(v)}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table><tr>${headerRow}</tr>${dataRows}</table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `expenses-${new Date().toISOString().split("T")[0]}.xls`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const GREETINGS = [
  "Hello",
  "Hey",
  "Hi",
  "Welcome back",
  "Good to see you",
  "Howdy",
  "Greetings",
  "Hey there",
  "What's up",
  "Glad you're here",
];

function RandomGreeting() {
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  return <>{greeting}</>;
}

function SortLinesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

type ExpensePayStatus = "paid" | "outstanding" | "unpaid";
type DesktopExpenseRow = {
  entry: ExpenseEntryRow;
  displayName: string;
  status: ExpensePayStatus;
  dueText: string;
  reminderText: string;
};

function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

function getExpensePayStatus(
  entry: ExpenseEntryRow,
  paidIds: Set<string>,
  paidMonthYm: string
): ExpensePayStatus {
  if (paidIds.has(entry.id)) return "paid";
  if (!entry.due_date) return "unpaid";
  const due = effectiveDueDateInPaidMonth(entry.due_date, paidMonthYm);
  if (!due) return "unpaid";
  if (due < startOfTodayLocal()) return "outstanding";
  return "unpaid";
}

export type ExpenseCashflowPageVariant = "dashboard" | "expenses";
type ExpenseCadenceTab = ExpenseCadenceTypeParam;

function cadenceLabel(cadence: ExpenseCadenceTab): string {
  if (cadence === "yearly") return "Yearly";
  if (cadence === "quarterly") return "Quarterly";
  return "Monthly";
}

export function ExpenseCashflowPage({
  pageVariant,
  initialExpenseCadence,
}: {
  pageVariant: ExpenseCashflowPageVariant;
  /** From `?type=` on `/dashboard/expenses` (server + deep links). */
  initialExpenseCadence?: ExpenseCadenceTypeParam;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const queryClient = useQueryClient();
  const { data: categoriesFromDb = [] } = useQuery(categoriesQueryOptions());
  const { data: subscriptionPlan } = useQuery(subscriptionPlanQueryOptions());
  const paidMonthQueryKey = getCurrentPaidMonth();
  const expenseDataQuery = useQuery({
    ...expenseDataQueryOptions(paidMonthQueryKey),
    enabled: !!user && !loading,
  });
  const expensePaymentHistoryQuery = useQuery({
    ...expensePaymentHistoryQueryOptions(EXPENSE_PAYMENT_HISTORY_MONTHS),
    enabled: !!user && !loading,
  });
  const monthlyBreakdownQuery = useQuery({
    ...monthlyBreakdownQueryOptions(EXPENSE_PAYMENT_HISTORY_MONTHS),
    enabled: !!user && !loading && pageVariant === "dashboard",
  });
  const billsDataQuery = useQuery({
    ...billsDataQueryOptions(paidMonthQueryKey),
    enabled: !!user && !loading && pageVariant === "dashboard",
  });
  const invalidateExpenseQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] });
  }, [queryClient]);
  const dashboardBenefits = [
    "Due-date reminders (3 days, 1 day, on the day) — Pro or Premium",
    "Unlimited expenses on every plan",
    "Export cashflow (CSV/PDF)",
    "Priority support",
    "Can leave review and suggestions (paid subscribers)",
  ];
  const categoriesList = useMemo(
    () => (categoriesFromDb.length > 0 ? categoriesFromDb : EXPENSE_CATEGORIES),
    [categoriesFromDb]
  );
  const orderedCategoryIds = useMemo(() => {
    if (categoriesFromDb.length > 0) {
      return [...categoriesFromDb].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.id);
    }
    return EXPENSE_CATEGORIES.map((c) => c.id);
  }, [categoriesFromDb]);
  const entries = expenseDataQuery.data?.entries ?? [];
  const isSubscriber = expenseDataQuery.data?.isSubscriber ?? false;
  const subscriptionExpired = expenseDataQuery.data?.subscriptionExpired ?? false;
  const paidMonthLabel = expenseDataQuery.data?.paidMonth ?? "";
  const prefsOptional = useUserPreferencesOptional();
  const paidMonthYm = useMemo(
    () => (/^\d{4}-\d{2}$/.test(paidMonthLabel) ? paidMonthLabel : getCurrentPaidMonth()),
    [paidMonthLabel]
  );
  const paidMonthDisplay = useMemo(() => {
    const [yearRaw, monthRaw] = paidMonthYm.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return paidMonthYm;
    }
    const monthDate = new Date(year, month - 1, 1);
    const locale =
      (prefsOptional?.preferences?.language ?? DEFAULT_USER_PREFERENCES.language) === "fil"
        ? "fil-PH"
        : "en-PH";
    return monthDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }, [paidMonthYm, prefsOptional?.preferences?.language]);
  const paidYearDisplay = useMemo(() => paidMonthYm.slice(0, 4), [paidMonthYm]);
  const paidIds = useMemo(
    () => new Set(expenseDataQuery.data?.paidEntryIds ?? []),
    [expenseDataQuery.data]
  );
  const { showError: showSnackbar } = useSnackbar();
  const { refreshBudget } = useBudgetRefresh();
  const [addStatus, setAddStatus] = useState<"idle" | "saving" | "error">("idle");
  const [addCategory, setAddCategory] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addName, setAddName] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addDueDate, setAddDueDate] = useState("");
  const [addReminderDays, setAddReminderDays] = useState<ReminderDay[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string>("");
  const [editAmount, setEditAmount] = useState("");
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editReminderDays, setEditReminderDays] = useState<ReminderDay[]>([]);
  const [addReminderChannel, setAddReminderChannel] = useState<"email" | "in-app" | "both">("both");
  const [editReminderChannel, setEditReminderChannel] = useState<"email" | "in-app" | "both">("both");
  const [editPaidStatus, setEditPaidStatus] = useState<"paid" | "unpaid">("unpaid");
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inlineNameEditId, setInlineNameEditId] = useState<string | null>(null);
  const [inlineNameDraft, setInlineNameDraft] = useState("");
  const skipInlineNameBlurCommitRef = useRef(false);
  const [expensesCategorized, setExpensesCategorized] = useState(false);
  const [expenseCadenceTab, setExpenseCadenceTab] = useState<ExpenseCadenceTab>(
    () => initialExpenseCadence ?? "monthly"
  );

  const applyExpenseCadenceTab = useCallback(
    (tab: ExpenseCadenceTab) => {
      setExpenseCadenceTab(tab);
      if (pageVariant !== "expenses") return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("type", tab);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pageVariant, pathname, router, searchParams]
  );

  const expensesTypeParam = searchParams.get("type");
  useEffect(() => {
    if (pageVariant !== "expenses") return;
    const parsed = parseExpenseCadenceTypeParam(expensesTypeParam);
    const next: ExpenseCadenceTab = parsed ?? "monthly";
    setExpenseCadenceTab((prev) => (prev === next ? prev : next));
  }, [pageVariant, expensesTypeParam]);
  const [filterPaid, setFilterPaid] = useState(false);
  const [filterUnpaid, setFilterUnpaid] = useState(false);
  const [filterPastDue, setFilterPastDue] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [draftFilterPaid, setDraftFilterPaid] = useState(false);
  const [draftFilterUnpaid, setDraftFilterUnpaid] = useState(false);
  const [draftFilterPastDue, setDraftFilterPastDue] = useState(false);
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [desktopTableSorting, setDesktopTableSorting] = useState<SortingState>([{ id: "status", desc: false }]);
  useEffect(() => {
    if (!filterMenuOpen) return;
    setDraftFilterPaid(filterPaid);
    setDraftFilterUnpaid(filterUnpaid);
    setDraftFilterPastDue(filterPastDue);
  }, [filterMenuOpen, filterPaid, filterUnpaid, filterPastDue]);
  useEffect(() => {
    const stored = readExpensesCategorizedPreference();
    if (stored !== null) setExpensesCategorized(stored);
  }, []);

  const setExpensesCategorizedPersisted = useCallback((next: boolean) => {
    setExpensesCategorized(next);
    writeExpensesCategorizedPreference(next);
  }, []);

  const formatPrefDate = useCallback(
    (input: Date | string) =>
      formatDateWithPreferences(
        input,
        prefsOptional?.preferences ?? DEFAULT_USER_PREFERENCES
      ),
    [prefsOptional?.preferences]
  );

  const togglePaidMutation = useMutation({
    mutationFn: async (vars: { entryId: string; month: string }) => {
      const res = await toggleExpensePayment(vars.entryId, vars.month);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onMutate: async ({ entryId, month }) => {
      const expenseKey = queryKeys.expenseData(month);
      const historyKey = queryKeys.expensePaymentHistory(EXPENSE_PAYMENT_HISTORY_MONTHS);
      await queryClient.cancelQueries({ queryKey: expenseKey });
      await queryClient.cancelQueries({ queryKey: historyKey });

      const previousExpense = queryClient.getQueryData<ExpenseData | null>(expenseKey);
      const previousHistory = queryClient.getQueryData<PaymentMonthStats[]>(historyKey);

      if (previousExpense) {
        const wasPaid = previousExpense.paidEntryIds.includes(entryId);
        queryClient.setQueryData<ExpenseData | null>(expenseKey, (old) => {
          if (!old) return old;
          const next = new Set(old.paidEntryIds);
          if (wasPaid) next.delete(entryId);
          else next.add(entryId);
          return { ...old, paidEntryIds: [...next] };
        });

        if (previousHistory) {
          queryClient.setQueryData<PaymentMonthStats[]>(historyKey, (old) => {
            if (!old) return old;
            return old.map((stat) => {
              if (stat.month !== month) return stat;
              const delta = wasPaid ? -1 : 1;
              const nextCount = stat.paidCount + delta;
              return {
                ...stat,
                paidCount: Math.min(stat.totalCount, Math.max(0, nextCount)),
              };
            });
          });
        }
      }

      return { previousExpense, previousHistory, expenseKey, historyKey };
    },
    onError: (err, _vars, ctx) => {
      showSnackbar(err instanceof Error ? err.message : "Could not update paid status.");
      if (ctx?.previousExpense !== undefined) {
        queryClient.setQueryData(ctx.expenseKey, ctx.previousExpense);
      }
      if (ctx?.previousHistory !== undefined) {
        queryClient.setQueryData(ctx.historyKey, ctx.previousHistory);
      }
    },
    onSuccess: () => {
      refreshBudget();
      invalidateExpenseQueries();
    },
  });

  function togglePaid(entryId: string) {
    togglePaidMutation.mutate({ entryId, month: paidMonthQueryKey });
  }

  const commitInlineNameEdit = useCallback(
    async (entryId: string) => {
      if (inlineNameEditId !== entryId) return;
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) {
        setInlineNameEditId(null);
        setInlineNameDraft("");
        return;
      }
      const next = inlineNameDraft.trim();
      const prev = (entry.note ?? "").trim();
      if (next === prev) {
        setInlineNameEditId(null);
        setInlineNameDraft("");
        return;
      }
      const reminders =
        isSubscriber && entry.due_date
          ? entry.reminder_days_before?.length
            ? (entry.reminder_days_before as ReminderDay[])
            : null
          : undefined;
      const result = await updateExpense(
        entry.id,
        entry.category_id,
        entry.amount,
        next || undefined,
        undefined,
        entry.due_date ?? undefined,
        reminders,
        undefined,
        (entry.reminder_channel as "email" | "in-app" | "both") ?? undefined
      );
      if (result.error) showSnackbar(result.error);
      else {
        invalidateExpenseQueries();
        refreshBudget();
      }
      setInlineNameEditId(null);
      setInlineNameDraft("");
    },
    [
      inlineNameEditId,
      inlineNameDraft,
      entries,
      isSubscriber,
      showSnackbar,
      invalidateExpenseQueries,
      refreshBudget,
    ]
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [user, loading, router]);

  const tabAllEntries = useMemo(() => {
    return entries.filter((entry) => {
      const cadence = entry.billing_period ?? "monthly";
      return cadence === expenseCadenceTab;
    });
  }, [entries, expenseCadenceTab]);
  const summaryEntries = useMemo(() => tabAllEntries, [tabAllEntries]);
  const totalExpenses = summaryEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalPaidThisMonth = summaryEntries.reduce((sum, e) => sum + (paidIds.has(e.id) ? e.amount : 0), 0);
  const unpaidThisMonth = Math.max(0, totalExpenses - totalPaidThisMonth);
  const listEntries = useMemo(() => {
    const noFilterSelected = !filterPaid && !filterUnpaid && !filterPastDue;
    if (noFilterSelected) return tabAllEntries;
    return tabAllEntries.filter((e) => {
      const status = getExpensePayStatus(e, paidIds, paidMonthYm);
      if (status === "paid") return filterPaid;
      if (status === "outstanding") return filterPastDue;
      return filterUnpaid;
    });
  }, [tabAllEntries, paidIds, paidMonthYm, filterPaid, filterUnpaid, filterPastDue]);
  const sortedCategoryGroupsList = useMemo(
    () => sortedCategoryGroupsFromEntries(listEntries, orderedCategoryIds, (e) => getExpensePayStatus(e, paidIds, paidMonthYm)),
    [listEntries, orderedCategoryIds, paidIds, paidMonthYm]
  );
  const flatEntriesOrderedList = useMemo(
    () => sortedCategoryGroupsList.flatMap(([, categoryEntries]) => categoryEntries),
    [sortedCategoryGroupsList]
  );
  const flatEntriesMobileSorted = useMemo(
    () =>
      [...flatEntriesOrderedList].sort(
        (a, b) =>
          STATUS_SORT_ORDER.indexOf(getExpensePayStatus(a, paidIds, paidMonthYm)) -
          STATUS_SORT_ORDER.indexOf(getExpensePayStatus(b, paidIds, paidMonthYm))
      ),
    [flatEntriesOrderedList, paidIds, paidMonthYm]
  );
  const editingEntry = useMemo(
    () => (editingId ? (entries.find((e) => e.id === editingId) ?? null) : null),
    [editingId, entries]
  );
  const editReminderSelectValue = useMemo(
    () => reminderSelectValueFromDays(editReminderDays),
    [editReminderDays]
  );
  const addReminderSelectValue = useMemo(
    () => reminderSelectValueFromDays(addReminderDays),
    [addReminderDays]
  );

  const paidCount = summaryEntries.filter((e) => paidIds.has(e.id)).length;
  const paidPct = totalExpenses > 0 ? Math.min(100, Math.round((totalPaidThisMonth / totalExpenses) * 100)) : 0;
  const cadenceCounts = useMemo(() => {
    const noFilterSelected = !filterPaid && !filterUnpaid && !filterPastDue;
    const counts: Record<ExpenseCadenceTab, number> = {
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    };
    for (const entry of entries) {
      const cadence = entry.billing_period ?? "monthly";
      if (noFilterSelected) {
        counts[cadence] += 1;
        continue;
      }
      const status = getExpensePayStatus(entry, paidIds, paidMonthYm);
      if (status === "paid" && filterPaid) counts[cadence] += 1;
      else if (status === "outstanding" && filterPastDue) counts[cadence] += 1;
      else if (status === "unpaid" && filterUnpaid) counts[cadence] += 1;
    }
    return counts;
  }, [entries, filterPaid, filterUnpaid, filterPastDue, paidIds, paidMonthYm]);
  const activeFilterCount =
    Number(filterPaid) + Number(filterUnpaid) + Number(filterPastDue);

  function resetAddExpenseForm() {
    setAddCategory("");
    setAddAmount("");
    setAddName("");
    setAddNotes("");
    setAddDueDate("");
    setAddReminderDays([]);
    setAddReminderChannel("both");
    setAddStatus("idle");
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(addAmount.replace(/\D/g, ""), 10) || 0;
    if (!addName.trim() || amount <= 0) return;
    const dueDate = addDueDate.trim() || undefined;
    const reminderDays =
      isSubscriber && dueDate && addReminderDays.length ? addReminderDays : undefined;
    setAddStatus("saving");
    const result = await addExpense(
      addCategory || "",
      amount,
      addName.trim(),
      addNotes.trim() || undefined,
      dueDate,
      reminderDays,
      expenseCadenceTab,
      addReminderChannel
    );
    if (result.error) {
      showSnackbar(result.error);
    } else {
      resetAddExpenseForm();
      invalidateExpenseQueries();
      refreshBudget();
      setAddExpenseModalOpen(false);
    }
    setAddStatus("idle");
  }

  function startEdit(entry: ExpenseEntryRow) {
    setAddExpenseModalOpen(false);
    setInlineNameEditId(null);
    setInlineNameDraft("");
    setEditingId(entry.id);
    setEditCategory(entry.category_id);
    setEditAmount(String(entry.amount));
    setEditName(
      entry.note?.trim()
        ? entry.note
        : getCategoryLabel(categoriesList, entry.category_id)
    );
    setEditNotes(entry.notes?.trim() ?? "");
    const effDue = entry.due_date
      ? effectiveDueDateInPaidMonth(entry.due_date, paidMonthYm)
      : null;
    setEditDueDate(effDue ? formatYmdLocal(effDue) : "");
    setEditReminderDays((entry.reminder_days_before ?? []) as ReminderDay[]);
    setEditReminderChannel((entry.reminder_channel as "email" | "in-app" | "both") ?? "both");
    setEditPaidStatus(paidIds.has(entry.id) ? "paid" : "unpaid");
    setEditStatus("idle");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditCategory("");
    setEditAmount("");
    setEditName("");
    setEditNotes("");
    setEditDueDate("");
    setEditReminderDays([]);
    setEditPaidStatus("unpaid");
    setEditStatus("idle");
  }

  async function beginInlineNameEdit(entry: ExpenseEntryRow) {
    if (editingId) cancelEdit();
    if (inlineNameEditId === entry.id) {
      await commitInlineNameEdit(entry.id);
      return;
    }
    if (inlineNameEditId) await commitInlineNameEdit(inlineNameEditId);
    setInlineNameEditId(entry.id);
    setInlineNameDraft(entry.note ?? "");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editName.trim() || !editAmount) return;
    const amount = parseInt(editAmount.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) return;
    setEditStatus("saving");
    const result = await updateExpense(
      editingId,
      editCategory || "",
      amount,
      editName.trim(),
      editNotes.trim() || undefined,
      editDueDate.trim() || undefined,
      isSubscriber && editDueDate.trim() ? (editReminderDays.length ? editReminderDays : null) : undefined,
      undefined,
      editReminderChannel
    );
    if (result.error) {
      showSnackbar(result.error);
      setEditStatus("error");
    } else {
      const shouldBePaid = editPaidStatus === "paid";
      const currentlyPaid = paidIds.has(editingId);
      if (shouldBePaid !== currentlyPaid) {
        const toggleRes = await toggleExpensePayment(editingId, paidMonthQueryKey);
        if (toggleRes.error) {
          showSnackbar(toggleRes.error);
          setEditStatus("error");
          return;
        }
      }
      invalidateExpenseQueries();
      refreshBudget();
      cancelEdit();
    }
  }

  async function handleDeleteExpense(entryId: string) {
    setDeletingId(entryId);
    const result = await deleteExpense(entryId);
    if (result.error) {
      showSnackbar(result.error);
    } else {
      if (editingId === entryId) cancelEdit();
      invalidateExpenseQueries();
      refreshBudget();
    }
    setDeletingId(null);
  }

  function renderExpenseEntryRow(entry: ExpenseEntryRow) {
    const payStatus = getExpensePayStatus(entry, paidIds, paidMonthYm);
    const displayName =
      entry.note?.trim() || getCategoryLabel(categoriesList, entry.category_id);
    const dueEffective = entry.due_date
      ? effectiveDueDateInPaidMonth(entry.due_date, paidMonthYm)
      : null;
    const dueText =
      dueEffective && !Number.isNaN(dueEffective.getTime())
        ? `Due ${formatPrefDate(dueEffective)}`
        : null;
    const hasReminders = (entry.reminder_days_before?.length ?? 0) > 0;
    const reminderLine = `Reminder date${(entry.reminder_days_before?.length ?? 0) !== 1 ? "s" : ""}: ${formatReminderDateList(entry.due_date ?? undefined, entry.reminder_days_before ?? undefined, formatPrefDate, paidMonthYm)}`;
    return (
      <li
        key={entry.id}
        className="py-2.5 first:pt-0 last:pb-0 transition-[filter,opacity]"
      >
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {inlineNameEditId === entry.id ? (
                <Input
                  value={inlineNameDraft}
                  onChange={(e) => setInlineNameDraft(e.target.value)}
                  className="h-8 max-w-[min(100%,20rem)] text-sm font-medium"
                  placeholder="Label"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commitInlineNameEdit(entry.id);
                    }
                    if (e.key === "Escape") {
                      skipInlineNameBlurCommitRef.current = true;
                      setInlineNameEditId(null);
                      setInlineNameDraft(entry.note ?? "");
                    }
                  }}
                  onBlur={() => {
                    if (skipInlineNameBlurCommitRef.current) {
                      skipInlineNameBlurCommitRef.current = false;
                      return;
                    }
                    void commitInlineNameEdit(entry.id);
                  }}
                  aria-label="Expense name"
                />
              ) : (
                <button
                  type="button"
                  className={cn(
                    "min-w-0 truncate text-left text-sm font-medium text-foreground underline-offset-2 hover:underline",
                    paidIds.has(entry.id) &&
                    "text-muted-foreground line-through decoration-muted-foreground"
                  )}
                  onClick={() => void beginInlineNameEdit(entry)}
                >
                  {displayName}
                </button>
              )}
              {payStatus === "paid" ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-emerald-500/50 bg-emerald-500/10 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                >
                  Paid
                </Badge>
              ) : payStatus === "outstanding" ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-500/50 bg-amber-500/15 text-xs font-medium text-amber-950 dark:text-amber-100"
                >
                  Outstanding
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="shrink-0 text-xs font-medium text-muted-foreground"
                >
                  Unpaid
                </Badge>
              )}
              {renderExpenseActions(entry)}
            </div>
            <span
              className={cn(
                "shrink-0 text-sm font-bold tabular-nums",
                paidIds.has(entry.id) && "text-muted-foreground line-through"
              )}
            >
              {formatCurrency(entry.amount)}
            </span>
          </div>
          {(dueText || hasReminders) && (
            <p className="text-xs text-muted-foreground">
              {dueText ? <span>{dueText}</span> : null}
              {dueText && hasReminders ? (
                <span className="text-muted-foreground/50"> • </span>
              ) : null}
              {hasReminders ? <span>{reminderLine}</span> : null}
            </p>
          )}
          {entry.notes?.trim() ? (
            <p className="text-xs text-muted-foreground">{entry.notes.trim()}</p>
          ) : null}
        </div>
      </li>
    );
  }

  function renderExpenseActions(entry: ExpenseEntryRow) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Expense actions"
            disabled={
              deletingId !== null ||
              (togglePaidMutation.isPending &&
                togglePaidMutation.variables?.entryId === entry.id)
            }
            onPointerDown={(e) => {
              if (inlineNameEditId === entry.id) e.preventDefault();
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-0 w-40">
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              startEdit(entry);
            }}
          >
            <Pencil className="text-muted-foreground" aria-hidden />
            Edit
          </DropdownMenuItem>
          {!paidIds.has(entry.id) ? (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => {
                void togglePaid(entry.id);
              }}
              disabled={
                togglePaidMutation.isPending &&
                togglePaidMutation.variables?.entryId === entry.id
              }
            >
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" aria-hidden />
              Mark as Paid
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => {
                void togglePaid(entry.id);
              }}
              disabled={
                togglePaidMutation.isPending &&
                togglePaidMutation.variables?.entryId === entry.id
              }
            >
              <XCircle className="text-muted-foreground" aria-hidden />
              Mark as Unpaid
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onSelect={() => {
              void handleDeleteExpense(entry.id);
            }}
            disabled={deletingId !== null}
          >
            <Trash2 className="text-destructive" aria-hidden />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const desktopTableRows = useMemo<DesktopExpenseRow[]>(
    () =>
      flatEntriesOrderedList.map((entry) => {
        const dueEffective = entry.due_date
          ? effectiveDueDateInPaidMonth(entry.due_date, paidMonthYm)
          : null;
        const dueText =
          dueEffective && !Number.isNaN(dueEffective.getTime())
            ? formatPrefDate(dueEffective)
            : "";
        const hasReminders = (entry.reminder_days_before?.length ?? 0) > 0;
        const reminderText = hasReminders
          ? formatReminderDateList(
            entry.due_date ?? undefined,
            entry.reminder_days_before ?? undefined,
            formatPrefDate,
            paidMonthYm
          )
          : "";
        return {
          entry,
          displayName: entry.note?.trim() || getCategoryLabel(categoriesList, entry.category_id),
          status: getExpensePayStatus(entry, paidIds, paidMonthYm),
          dueText,
          reminderText,
        };
      }),
    [flatEntriesOrderedList, paidMonthYm, formatPrefDate, categoriesList, paidIds]
  );

  const desktopColumns = useMemo<ColumnDef<DesktopExpenseRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.displayName.toLowerCase(),
        header: "Name",
        cell: ({ row }) => {
          const entry = row.original.entry;
          const isEditingName = inlineNameEditId === entry.id;
          return isEditingName ? (
            <Input
              value={inlineNameDraft}
              onChange={(e) => setInlineNameDraft(e.target.value)}
              className="h-8 max-w-[min(100%,20rem)] text-sm font-medium"
              placeholder="Label"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commitInlineNameEdit(entry.id);
                }
                if (e.key === "Escape") {
                  skipInlineNameBlurCommitRef.current = true;
                  setInlineNameEditId(null);
                  setInlineNameDraft(entry.note ?? "");
                }
              }}
              onBlur={() => {
                if (skipInlineNameBlurCommitRef.current) {
                  skipInlineNameBlurCommitRef.current = false;
                  return;
                }
                void commitInlineNameEdit(entry.id);
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              aria-label="Expense name"
            />
          ) : (
            <button
              type="button"
              className={cn(
                "min-w-0 truncate text-left text-sm font-medium text-foreground underline-offset-2 hover:underline",
                paidIds.has(entry.id) &&
                "text-muted-foreground line-through decoration-muted-foreground"
              )}
              onClick={(e) => {
                e.stopPropagation();
                void beginInlineNameEdit(entry);
              }}
            >
              {row.original.displayName}
            </button>
          );
        },
      },
      {
        id: "amount",
        accessorFn: (row) => row.entry.amount,
        header: "Amount",
        cell: ({ row }) => (
          <span className="tabular-nums">{formatCurrency(row.original.entry.amount)}</span>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: "Status",
        sortingFn: (rowA, rowB) => {
          const statusA = rowA.original.status;
          const statusB = rowB.original.status;
          return STATUS_SORT_ORDER.indexOf(statusA) - STATUS_SORT_ORDER.indexOf(statusB);
        },
        cell: ({ row }) => {
          const status = row.original.status;
          return status === "paid" ? (
            <Badge
              variant="outline"
              className="border-emerald-500/50 bg-emerald-500/10 text-xs font-medium text-emerald-800 dark:text-emerald-200"
            >
              Paid
            </Badge>
          ) : status === "outstanding" ? (
            <Badge
              variant="outline"
              className="border-amber-500/50 bg-amber-500/15 text-xs font-medium text-amber-950 dark:text-amber-100"
            >
              Outstanding
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
              Unpaid
            </Badge>
          );
        },
      },
      {
        id: "due",
        accessorFn: (row) => row.dueText,
        header: "Due",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.dueText || "—"}</span>
        ),
      },
      {
        id: "reminder",
        accessorFn: (row) => row.reminderText,
        header: "Reminder",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.reminderText || "—"}</span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="block text-center">Actions</span>,
        cell: ({ row }) => <div className="flex justify-end">{renderExpenseActionsInline(row.original.entry)}</div>,
      },
    ],
    [formatCurrency]
  );

  function renderExpenseActionsInline(entry: ExpenseEntryRow) {
    const markingThisEntry =
      togglePaidMutation.isPending && togglePaidMutation.variables?.entryId === entry.id;
    const deletingThisEntry = deletingId === entry.id;
    const busy = deletingId !== null || markingThisEntry;
    const isPaid = paidIds.has(entry.id);

    return (
      <div
        className="inline-flex items-center gap-1 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => startEdit(entry)}
          aria-label="Edit expense"
          title="Edit"
          disabled={busy}
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            isPaid
              ? "text-muted-foreground hover:text-foreground"
              : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          )}
          onClick={() => {
            void togglePaid(entry.id);
          }}
          aria-label={isPaid ? "Mark as unpaid" : "Mark as paid"}
          title={isPaid ? "Mark as unpaid" : "Mark as paid"}
          disabled={markingThisEntry || deletingId !== null}
        >
          {markingThisEntry ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : isPaid ? (
            <Undo2 className="h-4 w-4" aria-hidden />
          ) : (
            <Receipt className="h-4 w-4" aria-hidden />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            void handleDeleteExpense(entry.id);
          }}
          aria-label="Remove expense"
          title="Remove"
          disabled={deletingId !== null}
        >
          {deletingThisEntry ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>
    );
  }

  const desktopTable = useReactTable({
    data: desktopTableRows,
    columns: desktopColumns,
    state: { sorting: desktopTableSorting },
    onSortingChange: setDesktopTableSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading || !user) {
    return (
      <DashboardSkeleton variant={pageVariant === "dashboard" ? "dashboard" : "expenses"} />
    );
  }

  if (expenseDataQuery.isPending || expensePaymentHistoryQuery.isPending) {
    return (
      <DashboardSkeleton variant={pageVariant === "dashboard" ? "dashboard" : "expenses"} />
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8">
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) cancelEdit();
        }}
      >
        <DialogContent
          className="max-h-[min(90dvh,calc(100dvh-2rem))] max-w-[min(28rem,calc(100vw-2rem))] overflow-y-auto"
          showClose
        >
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? `Edit ${cadenceLabel(editingEntry.billing_period)} Expense` : "Edit Expense"}
            </DialogTitle>
            {editingEntry ? (
              <DialogDescription>
                {getCategoryLabel(categoriesList, editingEntry.category_id)}
                {" · "}
                {formatCurrency(editingEntry.amount)}
                {" · "}
                {paidIds.has(editingEntry.id)
                  ? "Paid"
                  : getExpensePayStatus(editingEntry, paidIds, paidMonthYm) === "outstanding"
                    ? "Past Due"
                    : "Unpaid"}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-expense-label">
                  Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-expense-label"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Netflix, HOA dues"
                  className="h-9"
                  required
                  aria-required
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label>Status</Label>
                <div
                  className="inline-flex h-9 w-full items-center gap-0 overflow-hidden rounded-md border bg-background p-0"
                  role="tablist"
                  aria-label="Expense payment status"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={editPaidStatus === "paid" ? "secondary" : "ghost"}
                    className={cn(
                      "h-full flex-1 rounded-none rounded-l-md px-2 text-xs shadow-none",
                      editPaidStatus === "paid" && "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white"
                    )}
                    role="tab"
                    aria-selected={editPaidStatus === "paid"}
                    onClick={() => setEditPaidStatus("paid")}
                  >
                    Paid
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={editPaidStatus === "unpaid" ? "secondary" : "ghost"}
                    className="h-full flex-1 rounded-none px-2 text-xs shadow-none"
                    role="tab"
                    aria-selected={editPaidStatus === "unpaid"}
                    onClick={() => setEditPaidStatus("unpaid")}
                  >
                    Unpaid
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-expense-category">Category</Label>
                <Select
                  value={
                    !editCategory
                      ? CATEGORY_SELECT_NONE
                      : categoriesList.some((c) => c.id === editCategory)
                        ? editCategory
                        : CATEGORY_SELECT_NONE
                  }
                  onValueChange={(v) => setEditCategory(v === CATEGORY_SELECT_NONE ? "" : v)}
                >
                  <SelectTrigger id="edit-expense-category" className="h-9 w-full">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value={CATEGORY_SELECT_NONE}>No category</SelectItem>
                    {categoriesList.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expense-amount">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <AmountInput
                  id="edit-expense-amount"
                  value={editAmount}
                  onChange={setEditAmount}
                  className="h-9 w-full"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="edit-expense-due">Due date</Label>
                <DatePicker
                  id="edit-expense-due"
                  value={editDueDate}
                  onChange={setEditDueDate}
                  placeholder="Due date"
                  title={
                    isSubscriber
                      ? "Same calendar day for each billing cycle"
                      : "Due dates are now available for everyone!"
                  }
                  formatDisplay={(ymd) => {
                    const d = parseYmdToLocalDate(ymd);
                    return d ? formatPrefDate(d) : "";
                  }}
                />
              </div>

              <div className="min-w-0 space-y-2">
                <HoverPopover
                  trigger={
                    <div className="flex items-center gap-1.5 cursor-help">
                      <Label htmlFor="edit-expense-reminder" className="cursor-help">Reminder</Label>
                      {!isSubscriber && (
                        <Gem className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                      )}
                    </div>
                  }
                  content={!isSubscriber ? "Reminders are available for Pro and Premium users." : undefined}
                  sideOffset={8}
                />
                <Select
                  value={editReminderSelectValue}
                  onValueChange={(v) =>
                    setEditReminderDays(v === EDIT_REMINDER_NONE ? [] : daysFromReminderKey(v))
                  }
                  disabled={!isSubscriber}
                >
                  <SelectTrigger
                    id="edit-expense-reminder"
                    className={cn(
                      "h-9 w-full",
                      !isSubscriber && "border-muted bg-muted text-muted-foreground disabled:opacity-100"
                    )}
                  >
                    <SelectValue placeholder="Choose reminder times" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {EDIT_REMINDER_SELECT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isSubscriber && editReminderDays.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="edit-expense-reminder-channel">Remind by</Label>
                <Select
                  value={editReminderChannel}
                  onValueChange={(v: any) => setEditReminderChannel(v)}
                >
                  <SelectTrigger id="edit-expense-reminder-channel" className="h-9 w-full">
                    <SelectValue placeholder="How to notify" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {REMINDER_CHANNEL_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-expense-notes">Notes</Label>
              <textarea
                id="edit-expense-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes e.g. Bill Account Number"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <DialogFooter className="pt-2">
              <div className="flex w-full items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0 rounded-full text-destructive hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Remove"
                  onClick={() => editingId && handleDeleteExpense(editingId)}
                  disabled={editStatus === "saving" || deletingId !== null}
                >
                  {deletingId === editingId ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                </Button>
                <div className="flex flex-1 gap-2">
                  <Button type="button" variant="outline" className="w-1/2" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-1/2"
                    disabled={
                      editStatus === "saving" ||
                      !editName.trim() ||
                      (parseInt(editAmount.replace(/\D/g, ""), 10) || 0) <= 0
                    }
                  >
                    {editStatus === "saving" ? "Saving" : "Save"}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {pageVariant === "expenses" && (
        <>
          <ContentHeader
            title="My Expenses"
            subtitle="This can be shared with your partner to mark bills as paid. Just go to Shared with me and give them access."
            icon={Banknote}
            className="mb-3 mt-4"
            actions={
              entries.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Share className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Export as</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => exportToCSV(desktopTableRows, categoriesFromDb)}>
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToExcel(desktopTableRows, categoriesFromDb)}>
                      Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null
            }
          />
          {entries.length > 0 && (() => {
            const pieData = [
              { name: "Paid", value: totalPaidThisMonth, color: "#10b981" },
              { name: "Unpaid", value: unpaidThisMonth, color: "#f97316" },
            ].filter((d) => d.value > 0);
            return (
              <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                {/* Stat cards */}
                <div className="flex flex-row gap-3 sm:w-1/3 sm:flex-col">
                  <div className="flex-1 rounded-xl border bg-card px-4 py-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                      {expenseCadenceTab === "yearly" ? "Total this year" : "Total this month"}
                    </p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(totalExpenses)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {expenseCadenceTab === "yearly" ? paidYearDisplay : paidMonthDisplay}
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl border bg-card px-4 py-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground">Unpaid</p>
                    <p className={cn("mt-0.5 text-lg font-bold tabular-nums", unpaidThisMonth > 0 ? "text-amber-600 dark:text-amber-400" : "")}>
                      {formatCurrency(unpaidThisMonth)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{paidPct}% paid</p>
                  </div>
                </div>

                {/* Pie chart */}
                <div className="sm:w-2/3">
                  {pieData.length > 0 ? (
                    <Card className="h-full">
                      <CardHeader className="pb-0 pt-4">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Paid vs unpaid
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3 pt-1 [&_svg]:outline-none">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart style={{ outline: "none" }}>
                            <Pie
                              style={{ outline: "none" }}
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={2}
                              labelLine={false}
                            >
                              {pieData.map((d, i) => (
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
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
                      No payment data yet
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {pageVariant === "dashboard" && (
        <>
          {/* ════════════════════ WELCOME ════════════════════ */}
          {user && (
            <p className="mt-4 mb-2 text-lg font-semibold text-foreground">
              <RandomGreeting />, {getAccountDisplayName(user).split(" ")[0]} 👋
            </p>
          )}

          {/* ════════════════════ HERO: MONTHLY OVERVIEW ════════════════════ */}
          {(() => {
            const billsList = billsDataQuery.data?.bills ?? [];
            const paidBillIds = new Set(billsDataQuery.data?.paidBillIds ?? []);
            const billsTotal = billsList.filter((b) => b.billing_period === "monthly").reduce((s, b) => s + b.amount, 0);
            const billsPaid = billsList.filter((b) => b.billing_period === "monthly" && paidBillIds.has(b.id)).reduce((s, b) => s + b.amount, 0);
            const billsUnpaid = Math.max(0, billsTotal - billsPaid);
            const billsPaidPct = billsTotal > 0 ? Math.min(100, Math.round((billsPaid / billsTotal) * 100)) : 0;
            const showRing = billsTotal > 0;
            return (
              <div className="relative mt-4 mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 p-6 text-primary-foreground shadow-lg dark:from-primary/80 dark:to-primary/50">
                <div className="absolute -right-11 -top-11 h-48 w-48 rounded-full bg-white/10 sm:h-52 sm:w-52" aria-hidden />
                <div className="absolute -bottom-7 -left-7 h-32 w-32 rounded-full bg-white/5 sm:h-36 sm:w-36" aria-hidden />

                <div className="flex items-start">
                  <div className={cn("min-w-0 flex-1 mb-2", showRing && "pr-32 sm:pr-36")}>
                    <p className="flex items-center gap-2 text-sm font-medium opacity-90">
                      <CalendarRange className="h-4 w-4" />
                      {paidMonthDisplay}
                    </p>
                    <p className="mt-2 text-sm opacity-80">Bills still to pay</p>
                    <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                      {formatCurrency(billsUnpaid)}
                    </p>
                  </div>
                  {showRing && (
                    <div className="absolute right-6 top-6 h-28 w-28">
                      {/* Ring */}
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(	#9FE2BF 0% ${billsPaidPct}%, rgba(255,255,255,0.25) ${billsPaidPct}% 100%)`,
                          WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
                          mask: "radial-gradient(circle, transparent 55%, black 56%)",
                        }}
                      />

                      {/* Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[10px] font-medium leading-tight text-primary-foreground">
                        <span className="opacity-80">Bills paid</span>
                        <span className="text-xl font-bold sm:text-2xl">
                          {billsPaidPct}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {
                  billsTotal > 0 && (
                    <div className="mt-6">
                      <div className="mb-1 flex justify-between text-xs font-medium opacity-80">
                        <span>Bills paid vs total</span>
                        <span>{formatCurrency(billsPaid)} / {formatCurrency(billsTotal)}</span>
                      </div>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/20">
                        <div className="bg-emerald-300 transition-all duration-500" style={{ width: `${billsPaidPct}%` }} />
                        <div className="flex-1 bg-white/10" />
                      </div>
                    </div>
                  )
                }
              </div>
            );
          })()}

          {/* ════════════════════ STAT CARDS ════════════════════ */}
          {(() => {
            const dailyAmt = entries.filter((e) => !e.due_date && e.category_id !== "savings").reduce((s, e) => s + e.amount, 0);
            const billsList = billsDataQuery.data?.bills ?? [];
            const paidBillIds = new Set(billsDataQuery.data?.paidBillIds ?? []);
            const billsTotal = billsList.filter((b) => b.billing_period === "monthly").reduce((s, b) => s + b.amount, 0);
            const billsPaid = billsList.filter((b) => b.billing_period === "monthly" && paidBillIds.has(b.id)).reduce((s, b) => s + b.amount, 0);
            const billsPaidCount = billsList.filter((b) => paidBillIds.has(b.id)).length;
            return (
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Link href="/dashboard/expenses" className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
                    <Banknote className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-lg font-bold">{formatCurrency(dailyAmt)}</p>
                  <p className="text-[10px] text-muted-foreground">Daily spending this month</p>
                </Link>

                <Link href="/dashboard/bills" className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">Bills</p>
                  <p className="text-lg font-bold">{formatCurrency(billsTotal)}</p>
                  <p className="text-[10px] text-muted-foreground">Recurring bills this month</p>
                </Link>

                <Link href="/dashboard/bills" className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">Bills paid</p>
                  <p className="text-lg font-bold">{formatCurrency(billsPaid)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {billsPaidCount}/{billsList.length} Bills paid this month
                  </p>
                </Link>

                <Link href="/dashboard" className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                    <CircleDollarSign className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">Bills + Expenses</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(billsTotal + dailyAmt)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Combined total this month
                  </p>
                </Link>
              </div>
            );
          })()}

          {/* ════════════════════ BILLS VS EXPENSES VS SAVINGS (MONTHLY) ════════════════════ */}
          {(() => {
            const breakdown = monthlyBreakdownQuery.data ?? [];
            if (!breakdown.length) return null;
            const hasData = breakdown.some((r) => r.bills > 0 || r.expenses > 0 || r.savings > 0);
            if (!hasData) return null;
            const chartData = breakdown.map((r) => ({
              month: new Date(`${r.month}-01`).toLocaleDateString("en-PH", { month: "short" }),
              Bills: r.bills,
              Expenses: r.expenses,
              Savings: r.savings,
            }));
            const BILL_COLOR = "hsl(199 89% 48%)";
            const EXP_COLOR = "hsl(38 92% 50%)";
            const SAV_COLOR = "hsl(142 71% 45%)";
            const fmtY = (v: number) => v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`;
            return (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Bills vs Expenses vs Savings</CardTitle>
                  <CardDescription>Last 6 months breakdown by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="25%" barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={fmtY} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", radius: 4 }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
                              <p className="mb-1.5 font-semibold">{label}</p>
                              {payload.map((p) => (
                                <p key={p.dataKey as string} style={{ color: p.fill }} className="leading-5">
                                  {String(p.dataKey)}: {formatCurrency(Number(p.value))}
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend
                        iconType="square"
                        iconSize={10}
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      />
                      <Bar dataKey="Bills" fill={BILL_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="Expenses" fill={EXP_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="Savings" fill={SAV_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })()}

          <Card className="mb-6 border-primary/25 bg-muted/20">
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium">Expenses & Bills</p>
                <p className="text-sm text-muted-foreground">
                  Track daily spending in Expenses, manage recurring bills in Bills.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="outline">
                  <Link href="/dashboard/expenses">Expenses</Link>
                </Button>
                <Button asChild>
                  <Link href="/dashboard/bills">Bills</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )
      }

      {
        pageVariant === "expenses" && (
          <>
            {/* ════════════════════ EXPENSES ════════════════════ */}
            <div className="mb-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="inline-flex w-full items-center gap-0.5 rounded-md border bg-background p-0.5 sm:w-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant={expenseCadenceTab === "monthly" ? "secondary" : "ghost"}
                        className="group h-9 flex-1 px-3 text-sm sm:flex-none"
                        onClick={() => applyExpenseCadenceTab("monthly")}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span>Monthly</span>
                          <Badge
                            variant={expenseCadenceTab === "monthly" ? "default" : "secondary"}
                            className={cn(
                              "h-5 min-w-5 px-1.5 text-[11px] transition-colors",
                              expenseCadenceTab === "monthly"
                                ? "bg-background text-foreground border-border group-hover:bg-background group-hover:text-foreground"
                                : "group-hover:bg-background group-hover:text-foreground group-hover:border-border"
                            )}
                          >
                            {cadenceCounts.monthly}
                          </Badge>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={expenseCadenceTab === "quarterly" ? "secondary" : "ghost"}
                        className="group h-9 flex-1 px-3 text-sm sm:flex-none"
                        onClick={() => applyExpenseCadenceTab("quarterly")}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span>Quarterly</span>
                          <Badge
                            variant={expenseCadenceTab === "quarterly" ? "default" : "secondary"}
                            className={cn(
                              "h-5 min-w-5 px-1.5 text-[11px] transition-colors",
                              expenseCadenceTab === "quarterly"
                                ? "bg-background text-foreground border-border group-hover:bg-background group-hover:text-foreground"
                                : "group-hover:bg-background group-hover:text-foreground group-hover:border-border"
                            )}
                          >
                            {cadenceCounts.quarterly}
                          </Badge>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={expenseCadenceTab === "yearly" ? "secondary" : "ghost"}
                        className="group h-9 flex-1 px-3 text-sm sm:flex-none"
                        onClick={() => applyExpenseCadenceTab("yearly")}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span>Yearly</span>
                          <Badge
                            variant={expenseCadenceTab === "yearly" ? "default" : "secondary"}
                            className={cn(
                              "h-5 min-w-5 px-1.5 text-[11px] transition-colors",
                              expenseCadenceTab === "yearly"
                                ? "bg-background text-foreground border-border group-hover:bg-background group-hover:text-foreground"
                                : "group-hover:bg-background group-hover:text-foreground group-hover:border-border"
                            )}
                          >
                            {cadenceCounts.yearly}
                          </Badge>
                        </span>
                      </Button>
                    </div>
                    <div className="inline-flex min-h-5 items-center gap-2.5">
                      <Label
                        id="expenses-categorized-label"
                        htmlFor="expenses-categorized"
                        className="mb-0 cursor-pointer select-none text-sm font-medium leading-none text-muted-foreground"
                      >
                        Categorized
                      </Label>
                      <ToggleSwitch
                        id="expenses-categorized"
                        aria-labelledby="expenses-categorized-label"
                        checked={expensesCategorized}
                        className="shrink-0"
                        onCheckedChange={setExpensesCategorizedPersisted}
                      />
                    </div>
                    <div className="ml-auto inline-flex items-center gap-2">
                      <StatusFilterDropdown
                        open={filterMenuOpen}
                        onOpenChange={setFilterMenuOpen}
                        menuLabel="Show statuses"
                        activeFilterCount={activeFilterCount}
                        triggerIcon={<SortLinesIcon className="h-4 w-4" aria-hidden />}
                        options={[
                          {
                            label: "Paid",
                            checked: draftFilterPaid,
                            onToggle: () => setDraftFilterPaid((prev) => !prev),
                          },
                          {
                            label: "Unpaid",
                            checked: draftFilterUnpaid,
                            onToggle: () => setDraftFilterUnpaid((prev) => !prev),
                          },
                          {
                            label: "Past Due",
                            checked: draftFilterPastDue,
                            onToggle: () => setDraftFilterPastDue((prev) => !prev),
                          },
                        ]}
                        onReset={() => {
                          setDraftFilterPaid(false);
                          setDraftFilterUnpaid(false);
                          setDraftFilterPastDue(false);
                          setFilterPaid(false);
                          setFilterUnpaid(false);
                          setFilterPastDue(false);
                          setFilterMenuOpen(false);
                        }}
                        onApply={() => {
                          setFilterPaid(draftFilterPaid);
                          setFilterUnpaid(draftFilterUnpaid);
                          setFilterPastDue(draftFilterPastDue);
                          setFilterMenuOpen(false);
                        }}
                      />
                      <Button
                        type="button"
                        className="shrink-0 gap-2 whitespace-nowrap"
                        onClick={() => {
                          resetAddExpenseForm();
                          setAddExpenseModalOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="sm:hidden">Add</span>
                        <span className="hidden sm:inline">Add Expense</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              {tabAllEntries.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <CircleDollarSign className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-3 text-muted-foreground">
                      {expenseCadenceTab === "yearly"
                        ? "No yearly expenses yet. Use Add to create your first yearly expense."
                        : expenseCadenceTab === "quarterly"
                          ? "No quarterly expenses yet. Use Add to create your first quarterly expense."
                          : "No expenses yet. Use Add expense to create your first one."}
                    </p>
                  </CardContent>
                </Card>
              ) : listEntries.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground/30" aria-hidden />
                    <p className="mt-3 text-muted-foreground">
                      No expenses match your selected filters right now.
                    </p>
                  </CardContent>
                </Card>
              ) : expensesCategorized ? (
                <div className="space-y-3">
                  {sortedCategoryGroupsList.map(([categoryId, categoryEntries]) => {
                    const total = categoryEntries.reduce((s, e) => s + e.amount, 0);
                    const countedInCategory = categoryEntries;
                    const catTotalCounted = countedInCategory.reduce((s, e) => s + e.amount, 0);
                    const catPaidCounted = countedInCategory.reduce(
                      (s, e) => s + (paidIds.has(e.id) ? e.amount : 0),
                      0
                    );
                    const catPaidPct =
                      catTotalCounted > 0
                        ? Math.min(100, Math.round((catPaidCounted / catTotalCounted) * 100))
                        : 0;
                    const allItemsPaidInCategory =
                      categoryEntries.length > 0 && categoryEntries.every((e) => paidIds.has(e.id));
                    return (
                      <Card
                        key={categoryId === "" ? "uncategorized" : categoryId}
                        className={cn(
                          "overflow-hidden",
                          categoryId
                            ? getCategoryBg(categoriesList, categoryId)
                            : "border-dashed border-muted-foreground/25 bg-muted/25"
                        )}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{getCategoryLabel(categoriesList, categoryId)}</CardTitle>
                              <span className="text-xs text-muted-foreground">{categoryEntries.length} item{categoryEntries.length !== 1 ? "s" : ""}</span>
                            </div>
                            <span
                              className={cn(
                                "text-lg font-bold tabular-nums",
                                allItemsPaidInCategory &&
                                "text-muted-foreground line-through decoration-muted-foreground"
                              )}
                            >
                              {formatCurrency(total)}
                            </span>
                          </div>
                          {catTotalCounted > 0 && (
                            <div className="mt-1.5 flex items-center gap-2" title="Share of this category marked paid for the current month">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                                <div
                                  className={cn(
                                    "h-full rounded-full bg-emerald-500 transition-all duration-500",
                                    catPaidPct === 0 && "opacity-40"
                                  )}
                                  style={{ width: `${catPaidPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{catPaidPct}%</span>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <ul className="divide-y divide-border/50">
                            {categoryEntries.map((entry) => renderExpenseEntryRow(entry))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <>
                  <Card className="overflow-hidden border-primary/15 bg-muted/20 md:hidden">
                    <CardContent className="px-4 py-3 sm:px-4">
                      <ul className="divide-y divide-border/50">
                        {flatEntriesMobileSorted.map((entry) => renderExpenseEntryRow(entry))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="hidden overflow-hidden border-primary/15 bg-muted/20 md:block">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          {desktopTable.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => {
                                const sorted = header.column.getIsSorted();
                                const sortable = header.column.getCanSort();
                                return (
                                  <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : sortable ? (
                                      <button
                                        type="button"
                                        onClick={header.column.getToggleSortingHandler()}
                                        className="inline-flex items-center gap-1 text-left"
                                      >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        <span className="text-[10px] text-muted-foreground">
                                          {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
                                        </span>
                                      </button>
                                    ) : (
                                      flexRender(header.column.columnDef.header, header.getContext())
                                    )}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableHeader>
                        <TableBody>
                          {desktopTable.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              className="cursor-pointer"
                              onDoubleClick={() => startEdit(row.original.entry)}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <Dialog open={addExpenseModalOpen} onOpenChange={setAddExpenseModalOpen}>
              <DialogContent
                className="max-h-[min(90dvh,calc(100dvh-2rem))] max-w-[min(28rem,calc(100vw-2rem))] overflow-y-auto"
                showClose
              >
                <DialogHeader>
                  <DialogTitle>
                    {`Add ${cadenceLabel(expenseCadenceTab)} Expense`}
                  </DialogTitle>
                  <DialogDescription>

                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-expense-label">
                      Label <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="add-expense-label"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      placeholder="e.g. Netflix, HOA dues"
                      className="h-9"
                      required
                      aria-required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="add-expense-category">Category</Label>
                      <Select
                        value={
                          !addCategory
                            ? CATEGORY_SELECT_NONE
                            : categoriesList.some((c) => c.id === addCategory)
                              ? addCategory
                              : CATEGORY_SELECT_NONE
                        }
                        onValueChange={(v) => setAddCategory(v === CATEGORY_SELECT_NONE ? "" : v)}
                      >
                        <SelectTrigger id="add-expense-category" className="h-9 w-full">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          <SelectItem value={CATEGORY_SELECT_NONE}>No category</SelectItem>
                          {categoriesList.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-expense-amount">
                        Amount <span className="text-destructive">*</span>
                      </Label>
                      <AmountInput
                        id="add-expense-amount"
                        value={addAmount}
                        onChange={setAddAmount}
                        className="h-9 w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 transition-all">
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="add-expense-due">Due date</Label>
                      <DatePicker
                        id="add-expense-due"
                        value={addDueDate}
                        onChange={setAddDueDate}
                        placeholder="Due date"
                        title={
                          isSubscriber
                            ? "Same calendar day for each billing cycle"
                            : "Due dates are now available for everyone!"
                        }
                        formatDisplay={(ymd) => {
                          const d = parseYmdToLocalDate(ymd);
                          return d ? formatPrefDate(d) : "";
                        }}
                        className="min-w-0"
                      />
                    </div>

                    <div className="min-w-0 space-y-2">
                      <HoverPopover
                        trigger={
                          <div className="flex items-center gap-1.5 cursor-help">
                            <Label htmlFor="add-expense-reminder" className="cursor-help">Reminder</Label>
                            {!isSubscriber && (
                              <Gem className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                            )}
                          </div>
                        }
                        content={!isSubscriber ? "Reminders are available for Pro and Premium users." : undefined}
                        sideOffset={8}
                      />
                      <Select
                        value={addReminderSelectValue}
                        onValueChange={(v) =>
                          setAddReminderDays(v === EDIT_REMINDER_NONE ? [] : daysFromReminderKey(v))
                        }
                        disabled={!isSubscriber}
                      >
                        <SelectTrigger
                          id="add-expense-reminder"
                          className={cn(
                            "h-9 w-full",
                            !isSubscriber && "border-muted bg-muted text-muted-foreground disabled:opacity-100"
                          )}
                        >
                          <SelectValue placeholder="Choose reminder times" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {EDIT_REMINDER_SELECT_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isSubscriber && addReminderDays.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="add-expense-reminder-channel">Remind by</Label>
                      <Select
                        value={addReminderChannel}
                        onValueChange={(v: any) => setAddReminderChannel(v)}
                      >
                        <SelectTrigger id="add-expense-reminder-channel" className="h-9 w-full">
                          <SelectValue placeholder="How to notify" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {REMINDER_CHANNEL_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="add-expense-notes">Notes</Label>
                    <textarea
                      id="add-expense-notes"
                      value={addNotes}
                      onChange={(e) => setAddNotes(e.target.value)}
                      placeholder="Add notes e.g. Bill Account Number"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <DialogFooter className="flex-col gap-2 pt-2">
                    <div className="flex flex-row gap-2">
                      <Button type="button" variant="outline" className="w-1/2" onClick={() => setAddExpenseModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="w-1/2"
                        disabled={
                          addStatus === "saving" ||
                          !addName.trim() ||
                          (parseInt(addAmount.replace(/\D/g, ""), 10) || 0) <= 0
                        }
                      >
                        {addStatus === "saving"
                          ? "Adding"
                          : "Add"}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )
      }

      {/* ════════════════════ SUBSCRIBE CTA ════════════════════ */}
      {
        subscriptionExpired && !isSubscriber && (
          <Card className="mx-auto max-w-2xl border-primary/50 bg-primary/5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full" aria-hidden />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg text-foreground">{subscriptionPlan?.name ?? "Pro"}</CardTitle>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {subscriptionPlan?.originalPriceAmount != null && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatCurrency(subscriptionPlan.originalPriceAmount, subscriptionPlan.priceCurrency)}
                  </span>
                )}
                <span className="text-2xl font-bold text-foreground">
                  {subscriptionPlan ? formatCurrency(subscriptionPlan.priceAmount, subscriptionPlan.priceCurrency) : "$3"}
                </span>
                <span className="text-sm text-muted-foreground">/{subscriptionPlan?.interval ?? "month"}</span>
              </div>
              <CardDescription className="mt-1">
                Reminders, unlimited expenses, export & more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {dashboardBenefits.map((item) => (
                <div key={item} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/account/subscription/payment" className="flex items-center justify-center gap-2">
                  <span>Subscribe & pay</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {subscriptionPlan?.originalPriceAmount != null && (
                      <span className="font-normal opacity-90 line-through">
                        {formatCurrency(subscriptionPlan.originalPriceAmount, subscriptionPlan?.priceCurrency)}
                      </span>
                    )}
                    <span>
                      {subscriptionPlan ? formatCurrency(subscriptionPlan.priceAmount, subscriptionPlan.priceCurrency) : "$3"}
                      <span className="font-normal opacity-90">/{subscriptionPlan?.interval ?? "month"}</span>
                    </span>
                  </span>
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )
      }
    </div >
  );
}
