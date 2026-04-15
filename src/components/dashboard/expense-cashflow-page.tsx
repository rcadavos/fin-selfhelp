"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  EXPENSE_PAYMENT_HISTORY_MONTHS,
  expenseDataQueryOptions,
  expensePaymentHistoryQueryOptions,
} from "@/lib/query/expenses";
import { queryKeys } from "@/lib/query/keys";
import { subscriptionPlanQueryOptions } from "@/lib/query/subscription-plan";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";
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
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
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
  Plus,
  Trash2,
  Check,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  CircleDollarSign,
  LayoutDashboard,
  CalendarRange,
  MoreHorizontal,
  Loader2,
  Pencil,
  XCircle,
} from "lucide-react";

const REMINDER_DAY_SORT_ORDER: ReminderDay[] = [3, 1, 0];

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
  orderedCategoryIds: string[]
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
  return uncategorized ? [...rest, uncategorized] : rest;
}

function getCategoryLabel(categories: { id: string; label: string }[], id: string): string {
  if (!id) return "Uncategorized";
  return categories.find((c) => c.id === id)?.label ?? id;
}

function getCategoryBg(categories: { id: string; bgClass: string }[], id: string): string {
  return categories.find((c) => c.id === id)?.bgClass ?? "";
}

function ProPremiumExpenseDivider() {
  return (
    <div className="relative py-3" role="separator" aria-label="Pro and Premium only below">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-border"
        aria-hidden
      />
      <p className="relative mx-auto w-fit max-w-[95%] bg-background px-2 text-center text-xs font-medium text-muted-foreground">
        ——— Pro/Premium users only ———
      </p>
    </div>
  );
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
type ExpenseCadenceTab = "monthly" | "yearly";

export function ExpenseCashflowPage({ pageVariant }: { pageVariant: ExpenseCashflowPageVariant }) {
  const router = useRouter();
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
  const paymentHistory: PaymentMonthStats[] = expensePaymentHistoryQuery.data ?? [];
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
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inlineNameEditId, setInlineNameEditId] = useState<string | null>(null);
  const [inlineNameDraft, setInlineNameDraft] = useState("");
  const skipInlineNameBlurCommitRef = useRef(false);
  const [expensesCategorized, setExpensesCategorized] = useState(false);
  const [expenseCadenceTab, setExpenseCadenceTab] = useState<ExpenseCadenceTab>("monthly");
  const [filterPaid, setFilterPaid] = useState(false);
  const [filterUnpaid, setFilterUnpaid] = useState(false);
  const [filterPastDue, setFilterPastDue] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [draftFilterPaid, setDraftFilterPaid] = useState(false);
  const [draftFilterUnpaid, setDraftFilterUnpaid] = useState(false);
  const [draftFilterPastDue, setDraftFilterPastDue] = useState(false);
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
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
        reminders
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
  const summaryEntries = useMemo(
    () => (pageVariant === "expenses" ? tabAllEntries : entries),
    [pageVariant, tabAllEntries, entries]
  );
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
    () => sortedCategoryGroupsFromEntries(listEntries, orderedCategoryIds),
    [listEntries, orderedCategoryIds]
  );
  const flatEntriesOrderedList = useMemo(
    () => sortedCategoryGroupsList.flatMap(([, categoryEntries]) => categoryEntries),
    [sortedCategoryGroupsList]
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
  const paidCountPct =
    summaryEntries.length > 0 ? Math.round((paidCount / summaryEntries.length) * 100) : 0;
  const activeFilterCount =
    Number(filterPaid) + Number(filterUnpaid) + Number(filterPastDue);

  function resetAddExpenseForm() {
    setAddCategory("");
    setAddAmount("");
    setAddName("");
    setAddNotes("");
    setAddDueDate("");
    setAddReminderDays([]);
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
      expenseCadenceTab
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
      isSubscriber && editDueDate.trim() ? (editReminderDays.length ? editReminderDays : null) : undefined
    );
    if (result.error) {
      showSnackbar(result.error);
      setEditStatus("error");
    } else {
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
                  <span className="text-muted-foreground/50"> · </span>
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

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8">
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) cancelEdit();
        }}
      >
        <DialogContent className="max-h-[min(90dvh,calc(100dvh-2rem))] max-w-md overflow-y-auto" showClose>
          <DialogHeader>
            <DialogTitle>
              {editingEntry?.billing_period === "yearly" ? "Edit Yearly Expense" : "Edit Monthly Expense"}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="edit-expense-label">
                  Label <span className="text-destructive">*</span>
                </Label>
                {editingEntry ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void togglePaid(editingEntry.id)}
                    disabled={
                      togglePaidMutation.isPending &&
                      togglePaidMutation.variables?.entryId === editingEntry.id
                    }
                  >
                    {paidIds.has(editingEntry.id) ? "Mark as Unpaid" : "Mark as Paid"}
                  </Button>
                ) : null}
              </div>
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
                <Label htmlFor="edit-expense-amount">Amount</Label>
                <AmountInput
                  id="edit-expense-amount"
                  value={editAmount}
                  onChange={setEditAmount}
                  className="h-9 w-full"
                />
              </div>
            </div>
            {!isSubscriber ? <ProPremiumExpenseDivider /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-expense-due">Due date</Label>
                <Input
                  id="edit-expense-due"
                  type="date"
                  className="h-9"
                  title={
                    isSubscriber
                      ? "Same calendar day each month"
                      : "Pro or Premium — unlock due dates and reminders"
                  }
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  disabled={!isSubscriber}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expense-reminder">Reminder</Label>
                <Select
                  value={editReminderSelectValue}
                  onValueChange={(v) =>
                    setEditReminderDays(v === EDIT_REMINDER_NONE ? [] : daysFromReminderKey(v))
                  }
                  disabled={!isSubscriber}
                >
                  <SelectTrigger id="edit-expense-reminder" className="h-9 w-full">
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
            <div className="space-y-2">
              <Label htmlFor="edit-expense-notes">Notes</Label>
              <textarea
                id="edit-expense-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <DialogFooter className="flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove expense"
                title="Remove expense"
                onClick={() => editingId && handleDeleteExpense(editingId)}
                disabled={editStatus === "saving" || deletingId !== null}
              >
                {deletingId === editingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
              </Button>
              <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
                <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 sm:flex-none"
                  disabled={
                    editStatus === "saving" ||
                    !editName.trim() ||
                    (parseInt(editAmount.replace(/\D/g, ""), 10) || 0) <= 0
                  }
                >
                  {editStatus === "saving" ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {pageVariant === "expenses" && (
        <>
          <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">My Expenses</h1>
              <div className="inline-flex items-center gap-1 rounded-md border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={expenseCadenceTab === "monthly" ? "secondary" : "ghost"}
                  className="h-8 px-3"
                  onClick={() => setExpenseCadenceTab("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={expenseCadenceTab === "yearly" ? "secondary" : "ghost"}
                  className="h-8 px-3"
                  onClick={() => setExpenseCadenceTab("yearly")}
                >
                  Yearly
                </Button>
              </div>
            </div>
          </div>
          {entries.length > 0 && (
            <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 p-4 text-primary-foreground shadow-lg dark:from-primary/80 dark:to-primary/50">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 sm:h-36 sm:w-36" aria-hidden />
              <div className="absolute -bottom-5 -left-5 h-20 w-20 rounded-full bg-white/5 sm:h-24 sm:w-24" aria-hidden />

              <div className="relative flex flex-row items-start justify-between gap-3 sm:items-start">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium opacity-90 sm:text-sm">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                    {expenseCadenceTab === "yearly"
                      ? `This year (${paidYearDisplay})`
                      : `This month (${paidMonthDisplay})`}
                  </p>
                  <div className="flex flex-col gap-1 text-xs tabular-nums sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-1 sm:text-sm">
                    <span>
                      <span className="opacity-80">Total </span>
                      <span className="font-bold">{formatCurrency(totalExpenses)}</span>
                    </span>
                    <span>
                      <span className="opacity-80">Paid </span>
                      <span className="font-bold text-emerald-200">{formatCurrency(totalPaidThisMonth)}</span>
                    </span>
                    <span>
                      <span className="opacity-80">Unpaid </span>
                      <span className="font-bold text-amber-200">{formatCurrency(unpaidThisMonth)}</span>
                    </span>
                  </div>
                </div>
                {totalExpenses > 0 && (
                  <div
                    className="relative h-20 w-20 shrink-0 rounded-full"
                    style={{
                      background: `conic-gradient(rgb(34 197 94) 0% ${paidPct}%, rgba(255,255,255,0.25) ${paidPct}% 100%)`,
                    }}
                    aria-hidden
                  >
                    <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-primary text-center text-[9px] font-medium leading-tight text-primary-foreground">
                      <span className="opacity-80">Paid</span>
                      <span className="text-base font-bold tabular-nums sm:text-lg">{paidPct}%</span>
                    </div>
                  </div>
                )}
              </div>
              {totalExpenses > 0 && (
                <div className="relative mt-4 space-y-1">
                  <div className="flex justify-between text-[11px] font-medium opacity-80 sm:text-xs">
                    <span>Paid vs Total</span>
                    <span className="tabular-nums">
                      {formatCurrency(totalPaidThisMonth)} / {formatCurrency(totalExpenses)}
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="bg-emerald-300 transition-all duration-500"
                      style={{ width: `${paidPct}%` }}
                    />
                    <div className="flex-1 bg-white/10" />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {pageVariant === "dashboard" && (
        <>
      {/* ════════════════════ HERO: MONTHLY OVERVIEW ════════════════════ */}
      <div className="relative mt-4 mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 p-6 text-primary-foreground shadow-lg dark:from-primary/80 dark:to-primary/50">
        <div className="absolute -right-11 -top-11 h-48 w-48 rounded-full bg-white/10 sm:h-52 sm:w-52" aria-hidden />
        <div className="absolute -bottom-7 -left-7 h-32 w-32 rounded-full bg-white/5 sm:h-36 sm:w-36" aria-hidden />

        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-medium opacity-90">
              <CalendarRange className="h-4 w-4" />
              This month ({paidMonthDisplay})
            </p>
            <p className="mt-1 text-sm opacity-80">Still to pay</p>
            <p className="text-4xl font-bold tracking-tight sm:text-5xl">
              {formatCurrency(unpaidThisMonth)}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Badge className="border-white/30 bg-white/20 text-white hover:bg-white/30">
                {paidCount} of {entries.length} bills marked paid
              </Badge>
              {entries.length > 0 && (
                <Badge className="border-white/30 bg-white/20 text-white hover:bg-white/30">
                  {paidCountPct}% complete
                </Badge>
              )}
            </div>
          </div>
          {totalExpenses > 0 && (
            <div
              className="relative h-28 w-28 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(rgb(34 197 94) 0% ${paidPct}%, rgba(255,255,255,0.25) ${paidPct}% 100%)`,
              }}
              aria-hidden
            >
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-primary text-center text-[10px] font-medium leading-tight text-primary-foreground">
                <span className="opacity-80">Paid</span>
                <span className="text-xl font-bold sm:text-2xl">{paidPct}%</span>
              </div>
            </div>
          )}
        </div>

        {totalExpenses > 0 && (
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-xs font-medium opacity-80">
              <span>Paid vs Total</span>
              <span>
                {formatCurrency(totalPaidThisMonth)} / {formatCurrency(totalExpenses)}
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="bg-emerald-300 transition-all duration-500"
                style={{ width: `${paidPct}%` }}
              />
              <div className="flex-1 bg-white/10" />
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════ STAT CARDS ════════════════════ */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Bills tracked</p>
          <p className="text-lg font-bold">{entries.length}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Total out</p>
          <p className="text-lg font-bold">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Paid this month</p>
          <p className="text-lg font-bold">{formatCurrency(totalPaidThisMonth)}</p>
          {totalExpenses > 0 && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${paidPct}%` }} />
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Unpaid</p>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCurrency(unpaidThisMonth)}</p>
        </div>
      </div>

      {/* ════════════════════ PAYMENT HISTORY (6 MO) ════════════════════ */}
      {paymentHistory.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment completion by month</CardTitle>
            <CardDescription>Share of bills marked paid each month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end justify-between gap-1 sm:gap-2">
              {paymentHistory.map((row) => {
                const pct =
                  row.totalCount > 0 ? Math.round((row.paidCount / row.totalCount) * 100) : 0;
                const barPx = Math.max(6, Math.round((pct / 100) * 96));
                return (
                  <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full max-w-[3rem] items-end justify-center">
                      <div
                        className="w-full max-w-10 rounded-t-md bg-primary/80 transition-all"
                        style={{ height: `${barPx}px` }}
                        title={`${row.month}: ${row.paidCount}/${row.totalCount}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {row.month.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-primary/25 bg-muted/20">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">Bills & expenses</p>
            <p className="text-sm text-muted-foreground">
              Add, edit, and mark bills paid in My Expenses.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/my-expenses">Open My Expenses</Link>
          </Button>
        </CardContent>
      </Card>
        </>
      )}

      {pageVariant === "expenses" && (
        <>
      {/* ════════════════════ EXPENSES ════════════════════ */}
      <div className="mb-6">
        <div className="mb-4 flex flex-row items-start justify-between gap-3 sm:gap-6">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2
                id="expenses-section-heading"
                className="text-lg font-semibold leading-none tracking-tight"
              >
                Expenses
              </h2>
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
                  aria-labelledby="expenses-section-heading expenses-categorized-label"
                  checked={expensesCategorized}
                  className="shrink-0"
                  onCheckedChange={setExpensesCategorizedPersisted}
                />
              </div>
            </div>
            {entries.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {listEntries.length} item{listEntries.length !== 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-row items-center justify-end gap-2 pt-0.5">
            <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                  <SortLinesIcon className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Filter</span>
                  {activeFilterCount > 0 ? (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Show statuses</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="group cursor-pointer hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[highlighted]:bg-transparent"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDraftFilterPaid((prev) => !prev);
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-sm border border-input transition-shadow group-hover:ring-2 group-hover:ring-ring group-hover:ring-offset-1 group-data-[highlighted]:ring-2 group-data-[highlighted]:ring-ring group-data-[highlighted]:ring-offset-1",
                      draftFilterPaid && "bg-primary text-primary-foreground border-primary"
                    )}
                    aria-hidden
                  >
                    {draftFilterPaid ? <Check className="h-3 w-3" /> : null}
                  </span>
                  Paid
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="group cursor-pointer hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[highlighted]:bg-transparent"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDraftFilterUnpaid((prev) => !prev);
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-sm border border-input transition-shadow group-hover:ring-2 group-hover:ring-ring group-hover:ring-offset-1 group-data-[highlighted]:ring-2 group-data-[highlighted]:ring-ring group-data-[highlighted]:ring-offset-1",
                      draftFilterUnpaid && "bg-primary text-primary-foreground border-primary"
                    )}
                    aria-hidden
                  >
                    {draftFilterUnpaid ? <Check className="h-3 w-3" /> : null}
                  </span>
                  Unpaid
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="group cursor-pointer hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[highlighted]:bg-transparent"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDraftFilterPastDue((prev) => !prev);
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-sm border border-input transition-shadow group-hover:ring-2 group-hover:ring-ring group-hover:ring-offset-1 group-data-[highlighted]:ring-2 group-data-[highlighted]:ring-ring group-data-[highlighted]:ring-offset-1",
                      draftFilterPastDue && "bg-primary text-primary-foreground border-primary"
                    )}
                    aria-hidden
                  >
                    {draftFilterPastDue ? <Check className="h-3 w-3" /> : null}
                  </span>
                  Past Due
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-end gap-2 p-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraftFilterPaid(false);
                      setDraftFilterUnpaid(false);
                      setDraftFilterPastDue(false);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setFilterPaid(draftFilterPaid);
                      setFilterUnpaid(draftFilterUnpaid);
                      setFilterPastDue(draftFilterPastDue);
                      setFilterMenuOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
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
        {tabAllEntries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <CircleDollarSign className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-muted-foreground">
                {expenseCadenceTab === "yearly"
                  ? "No yearly expenses yet. Use Add to create your first yearly expense."
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
          <Card className="overflow-hidden border-primary/15 bg-muted/20">
            <CardContent className="px-4 py-3 sm:px-4">
              <ul className="divide-y divide-border/50">
                {flatEntriesOrderedList.map((entry) => renderExpenseEntryRow(entry))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={addExpenseModalOpen} onOpenChange={setAddExpenseModalOpen}>
        <DialogContent className="max-h-[min(90dvh,calc(100dvh-2rem))] max-w-md overflow-y-auto" showClose>
          <DialogHeader>
            <DialogTitle>
              {expenseCadenceTab === "yearly" ? "Add Yearly Expense" : "Add Monthly Expense"}
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="add-expense-amount">Amount</Label>
                <AmountInput
                  id="add-expense-amount"
                  value={addAmount}
                  onChange={setAddAmount}
                  className="h-9 w-full"
                />
              </div>
            </div>
            {!isSubscriber ? <ProPremiumExpenseDivider /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-expense-due">Due date</Label>
                <Input
                  id="add-expense-due"
                  type="date"
                  className="h-9"
                  title={
                    isSubscriber
                      ? "Same calendar day each month"
                      : "Pro or Premium — unlock due dates and reminders"
                  }
                  value={addDueDate}
                  onChange={(e) => setAddDueDate(e.target.value)}
                  disabled={!isSubscriber}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-expense-reminder">Reminder</Label>
                <Select
                  value={addReminderSelectValue}
                  onValueChange={(v) =>
                    setAddReminderDays(v === EDIT_REMINDER_NONE ? [] : daysFromReminderKey(v))
                  }
                  disabled={!isSubscriber}
                >
                  <SelectTrigger id="add-expense-reminder" className="h-9 w-full">
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
            <div className="space-y-2">
              <Label htmlFor="add-expense-notes">Notes</Label>
              <textarea
                id="add-expense-notes"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Optional notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <DialogFooter className="flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end sm:gap-2">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => setAddExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 sm:flex-none"
                disabled={
                  addStatus === "saving" ||
                  !addName.trim() ||
                  (parseInt(addAmount.replace(/\D/g, ""), 10) || 0) <= 0
                }
              >
                {addStatus === "saving"
                  ? "Adding…"
                  : expenseCadenceTab === "yearly"
                    ? "Add Yearly Expense"
                    : "Add Monthly Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
        </>
      )}

      {/* ════════════════════ SUBSCRIBE CTA ════════════════════ */}
      {subscriptionExpired && !isSubscriber && (
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
      )}
    </div>
  );
}
