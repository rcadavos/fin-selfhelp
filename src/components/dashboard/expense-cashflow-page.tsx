"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { loadExpenseData, addExpense, updateExpense, deleteExpense } from "@/actions/budget";
import { getPaymentHistoryMonths, toggleExpensePayment, type PaymentMonthStats } from "@/actions/expense-payments";
import { FREE_TIER_EXPENSE_LIMIT } from "@/types/database.types";
import { useUser } from "@/hooks/use-user";
import { useBudgetRefresh } from "@/contexts/budget-refresh";
import type { ReminderDay } from "@/types/database.types";
import { EXPENSE_CATEGORIES, REMINDER_OPTIONS } from "@/types/database.types";
import type { ExpenseEntryRow } from "@/actions/budget";
import {
  effectiveDueDateInPaidMonth,
  formatReminderDateList,
  formatYmdLocal,
} from "@/lib/expense-due-date";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { subscriptionPlanQueryOptions } from "@/lib/query/subscription-plan";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import {
  DEFAULT_USER_PREFERENCES,
  formatDateWithPreferences,
} from "@/lib/user-preferences";
import {
  Plus,
  Trash2,
  Bell,
  Check,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  CircleDollarSign,
  LayoutDashboard,
  CalendarRange,
  MoreHorizontal,
} from "lucide-react";

type AddExpenseLine = { id: string; category: string; amount: string; name: string; dueDate: string; reminderDays: ReminderDay[] };
function newAddLine(): AddExpenseLine {
  return { id: crypto.randomUUID(), category: "", amount: "", name: "", dueDate: "", reminderDays: [] };
}

function formatReminderLabel(days: number[]): string {
  if (!days.length) return "—";
  return days
    .sort((a, b) => b - a)
    .map((d) => (d === 0 ? "Due" : `${d}d`))
    .join(", ");
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

function getCategoryLabel(categories: { id: string; label: string }[], id: string): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}

function getCategoryBg(categories: { id: string; bgClass: string }[], id: string): string {
  return categories.find((c) => c.id === id)?.bgClass ?? "";
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

export function ExpenseCashflowPage({ pageVariant }: { pageVariant: ExpenseCashflowPageVariant }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const { data: categoriesFromDb = [] } = useQuery(categoriesQueryOptions());
  const { data: subscriptionPlan } = useQuery(subscriptionPlanQueryOptions());
  const dashboardBenefits = [
    "Due-date reminders (3 days, 1 day, on the day)",
    "Unlimited expenses",
    "Export cashflow (CSV/PDF)",
    "Priority support",
    "Can leave review and suggestions",
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
  const [budgetDataLoaded, setBudgetDataLoaded] = useState(false);
  const [entries, setEntries] = useState<ExpenseEntryRow[]>([]);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [paidMonthLabel, setPaidMonthLabel] = useState("");
  const paidMonthYm = useMemo(
    () => (/^\d{4}-\d{2}$/.test(paidMonthLabel) ? paidMonthLabel : getCurrentPaidMonth()),
    [paidMonthLabel]
  );
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [paymentHistory, setPaymentHistory] = useState<PaymentMonthStats[]>([]);
  const [addLines, setAddLines] = useState<AddExpenseLine[]>(() => [newAddLine()]);
  const { showError: showSnackbar } = useSnackbar();
  const { refreshBudget } = useBudgetRefresh();
  const [addStatus, setAddStatus] = useState<"idle" | "saving" | "error">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string>("");
  const [editAmount, setEditAmount] = useState("");
  const [editName, setEditName] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editReminderDays, setEditReminderDays] = useState<ReminderDay[]>([]);
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [addInlineCategory, setAddInlineCategory] = useState("");
  const [addInlineAmount, setAddInlineAmount] = useState("");
  const [addInlineName, setAddInlineName] = useState("");
  const [addInlineDueDate, setAddInlineDueDate] = useState("");
  const [addInlineReminderDays, setAddInlineReminderDays] = useState<ReminderDay[]>([]);
  const [addInlineStatus, setAddInlineStatus] = useState<"idle" | "saving" | "error">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingPaidId, setTogglingPaidId] = useState<string | null>(null);
  const [inlineNameEditId, setInlineNameEditId] = useState<string | null>(null);
  const [inlineNameDraft, setInlineNameDraft] = useState("");
  const skipInlineNameBlurCommitRef = useRef(false);
  const prefsOptional = useUserPreferencesOptional();

  const formatPrefDate = useCallback(
    (input: Date | string) =>
      formatDateWithPreferences(
        input,
        prefsOptional?.preferences ?? DEFAULT_USER_PREFERENCES
      ),
    [prefsOptional?.preferences]
  );

  async function togglePaid(entryId: string) {
    const month = getCurrentPaidMonth();
    setTogglingPaidId(entryId);
    const res = await toggleExpensePayment(entryId, month);
    setTogglingPaidId(null);
    if (res.error) {
      showSnackbar(res.error);
      return;
    }
    refreshBudget();
    load();
  }

  const load = useCallback(() => {
    const month = getCurrentPaidMonth();
    Promise.all([loadExpenseData(month), getPaymentHistoryMonths(6)])
      .then(([data, hist]) => {
        if (data) {
          setIsSubscriber(data.isSubscriber);
          setSubscriptionExpired(data.subscriptionExpired);
          setEntries(data.entries);
          setPaidMonthLabel(data.paidMonth);
          setPaidIds(new Set(data.paidEntryIds));
        }
        if (hist?.stats) setPaymentHistory(hist.stats);
        else setPaymentHistory([]);
        setBudgetDataLoaded(true);
      })
      .catch(() => setBudgetDataLoaded(true));
  }, []);

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
        entry.due_date ?? undefined,
        reminders
      );
      if (result.error) showSnackbar(result.error);
      else {
        load();
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
      load,
      refreshBudget,
    ]
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    load();
  }, [user, loading, router, load]);

  const freeTierLimitApplied = !isSubscriber && entries.length > FREE_TIER_EXPENSE_LIMIT;
  const entriesCounted = freeTierLimitApplied ? entries.slice(0, FREE_TIER_EXPENSE_LIMIT) : entries;
  const countedEntryIds = freeTierLimitApplied ? new Set(entriesCounted.map((e) => e.id)) : new Set<string>();
  const totalExpenses = entriesCounted.reduce((sum, e) => sum + e.amount, 0);
  const totalPaidThisMonth = entriesCounted.reduce((sum, e) => sum + (paidIds.has(e.id) ? e.amount : 0), 0);
  const unpaidThisMonth = Math.max(0, totalExpenses - totalPaidThisMonth);
  const grouped = groupEntriesByCategory(entries);
  const canAddMoreExpenses = isSubscriber || entries.length < FREE_TIER_EXPENSE_LIMIT;

  const paidCount = entriesCounted.filter((e) => paidIds.has(e.id)).length;
  const paidPct = totalExpenses > 0 ? Math.min(100, Math.round((totalPaidThisMonth / totalExpenses) * 100)) : 0;
  const paidCountPct =
    entriesCounted.length > 0 ? Math.round((paidCount / entriesCounted.length) * 100) : 0;

  function setAddLine(id: string, patch: Partial<AddExpenseLine>) {
    setAddLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  }

  function addAddLine() {
    setAddLines((prev) => [...prev, newAddLine()]);
  }

  function removeAddLine(id: string) {
    setAddLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const toAdd = addLines
      .map((line) => ({
        category: line.category,
        amount: parseInt(line.amount.replace(/\D/g, ""), 10) || 0,
        name: line.name.trim() || undefined,
        dueDate: line.dueDate.trim() || undefined,
        reminderDays: isSubscriber && line.dueDate.trim() && line.reminderDays.length ? line.reminderDays : undefined,
      }))
      .filter((l) => l.category && l.amount > 0);
    if (toAdd.length === 0) return;
    setAddStatus("saving");
    let hadError = false;
    for (const { category, amount, name, dueDate, reminderDays } of toAdd) {
      const result = await addExpense(category, amount, name, dueDate, reminderDays);
      if (result.error) {
        showSnackbar(result.error);
        hadError = true;
        break;
      }
    }
    if (!hadError) {
      setAddLines([newAddLine()]);
      load();
      refreshBudget();
    }
    setAddStatus("idle");
  }

  function startEdit(entry: ExpenseEntryRow) {
    setInlineNameEditId(null);
    setInlineNameDraft("");
    setEditingId(entry.id);
    setEditCategory(entry.category_id);
    setEditAmount(String(entry.amount));
    setEditName(entry.note ?? "");
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
    setEditDueDate("");
    setEditReminderDays([]);
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

  function toggleEditReminder(day: ReminderDay) {
    setEditReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => b - a)
    );
  }

  function setLineReminder(lineId: string, day: ReminderDay) {
    setAddLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              reminderDays: l.reminderDays.includes(day)
                ? l.reminderDays.filter((d) => d !== day)
                : [...l.reminderDays, day].sort((a, b) => b - a),
            }
          : l
      )
    );
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editCategory || !editAmount) return;
    const amount = parseInt(editAmount.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) return;
    setEditStatus("saving");
    const result = await updateExpense(
      editingId,
      editCategory,
      amount,
      editName.trim() || undefined,
      editDueDate.trim() || undefined,
      isSubscriber && editDueDate.trim() ? (editReminderDays.length ? editReminderDays : null) : undefined
    );
    if (result.error) {
      showSnackbar(result.error);
      setEditStatus("error");
    } else {
      load();
      refreshBudget();
      setEditingId(null);
      setEditCategory("");
      setEditAmount("");
      setEditName("");
      setEditDueDate("");
      setEditStatus("idle");
    }
  }

  function startAddToCategory(categoryId: string) {
    setAddingToCategory(categoryId);
    setAddInlineCategory(categoryId);
    setAddInlineAmount("");
    setAddInlineName("");
    setAddInlineDueDate("");
    setAddInlineReminderDays([]);
    setAddInlineStatus("idle");
  }

  function cancelAddToCategory() {
    setAddingToCategory(null);
    setAddInlineCategory("");
    setAddInlineAmount("");
    setAddInlineName("");
    setAddInlineDueDate("");
    setAddInlineReminderDays([]);
  }

  function toggleInlineReminder(day: ReminderDay) {
    setAddInlineReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => b - a)
    );
  }

  async function handleDeleteExpense(entryId: string) {
    setDeletingId(entryId);
    const result = await deleteExpense(entryId);
    if (result.error) {
      showSnackbar(result.error);
    } else {
      if (editingId === entryId) setEditingId(null);
      load();
      refreshBudget();
    }
    setDeletingId(null);
  }

  async function handleAddToCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!addInlineCategory) return;
    const amount = parseInt(addInlineAmount.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) return;
    setAddInlineStatus("saving");
    const reminderDays =
      isSubscriber && addInlineDueDate.trim() && addInlineReminderDays.length
        ? addInlineReminderDays
        : undefined;
    const result = await addExpense(
      addInlineCategory,
      amount,
      addInlineName.trim() || undefined,
      addInlineDueDate.trim() || undefined,
      reminderDays ?? undefined
    );
    if (result.error) {
      showSnackbar(result.error);
      setAddInlineStatus("error");
    } else {
      load();
      refreshBudget();
      setAddingToCategory(null);
      setAddInlineAmount("");
      setAddInlineName("");
      setAddInlineDueDate("");
      setAddInlineReminderDays([]);
      setAddInlineStatus("idle");
    }
  }

  if (loading || !user) {
    return (
      <DashboardSkeleton variant={pageVariant === "dashboard" ? "dashboard" : "expenses"} />
    );
  }

  if (!budgetDataLoaded) {
    return (
      <DashboardSkeleton variant={pageVariant === "dashboard" ? "dashboard" : "expenses"} />
    );
  }

  // ── Reminder dropdown (shared for edit/add forms) ──
  function ReminderDropdown({
    days,
    onToggle,
    disabled,
  }: {
    days: ReminderDay[];
    onToggle: (day: ReminderDay) => void;
    disabled?: boolean;
  }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2"
            aria-label="Reminders"
          >
            <Bell className="h-3.5 w-3.5" />
            {days.length > 0 && <span className="text-xs">{formatReminderLabel(days)}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 min-w-[16rem]">
          <DropdownMenuLabel className="text-muted-foreground font-normal text-left text-xs">
            You will be reminded by email when an expense is due (at the times you select below).
          </DropdownMenuLabel>
          {!isSubscriber && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground font-normal text-left text-xs">
                Pro tier only. Subscribe to enable reminders.
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          {REMINDER_OPTIONS.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={days.includes(opt.value)}
              onCheckedChange={() => onToggle(opt.value)}
              disabled={disabled || !isSubscriber}
              className="w-full pl-6"
            >
              {opt.value === 0 ? "On due date" : `${opt.value} days before`}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8">
      {pageVariant === "expenses" && (
        <>
          <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold tracking-tight">My Expenses</h1>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard" className="gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
          {entriesCounted.length > 0 && (
            <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 p-4 text-primary-foreground shadow-lg dark:from-primary/80 dark:to-primary/50">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" aria-hidden />
              <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/5" aria-hidden />

              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium opacity-90 sm:text-sm">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                    This month ({paidMonthLabel})
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums sm:text-base">
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
                    className="relative mx-auto h-14 w-14 shrink-0 rounded-full sm:mx-0"
                    style={{
                      background: `conic-gradient(rgb(34 197 94) 0% ${paidPct}%, rgba(255,255,255,0.25) ${paidPct}% 100%)`,
                    }}
                    aria-hidden
                  >
                    <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-primary text-center text-[9px] font-medium leading-tight text-primary-foreground">
                      <span className="opacity-80">Paid</span>
                      <span className="text-xs font-bold tabular-nums sm:text-sm">{paidPct}%</span>
                    </div>
                  </div>
                )}
              </div>
              {totalExpenses > 0 && (
                <div className="relative mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-medium opacity-80 sm:text-xs">
                    <span>Paid vs total</span>
                    <span className="tabular-nums">
                      {formatCurrency(totalPaidThisMonth)} / {formatCurrency(totalExpenses)}
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/20 sm:h-3">
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
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" aria-hidden />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium opacity-90">
              <CalendarRange className="h-4 w-4" />
              This month ({paidMonthLabel})
            </p>
            <p className="mt-1 text-sm opacity-80">Still to pay</p>
            <p className="text-4xl font-bold tracking-tight sm:text-5xl">
              {formatCurrency(unpaidThisMonth)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="border-white/30 bg-white/20 text-white hover:bg-white/30">
                {paidCount} of {entriesCounted.length} bills marked paid
              </Badge>
              {entriesCounted.length > 0 && (
                <Badge className="border-white/30 bg-white/20 text-white hover:bg-white/30">
                  {paidCountPct}% complete
                </Badge>
              )}
            </div>
          </div>
          {totalExpenses > 0 && (
            <div
              className="relative mx-auto h-28 w-28 shrink-0 rounded-full sm:mx-0"
              style={{
                background: `conic-gradient(rgb(34 197 94) 0% ${paidPct}%, rgba(255,255,255,0.25) ${paidPct}% 100%)`,
              }}
              aria-hidden
            >
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-primary text-center text-[10px] font-medium leading-tight text-primary-foreground">
                <span className="opacity-80">Paid</span>
                <span className="text-lg font-bold">{paidPct}%</span>
              </div>
            </div>
          )}
        </div>

        {totalExpenses > 0 && (
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-xs font-medium opacity-80">
              <span>Paid vs total</span>
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
          <p className="text-lg font-bold">{entriesCounted.length}</p>
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
      {/* ════════════════════ EXPENSES BY CATEGORY ════════════════════ */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Expenses by category</h2>
          {entries.length > 0 && (
            <span className="text-sm text-muted-foreground">{entries.length} item{entries.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        {entries.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <CircleDollarSign className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-muted-foreground">No expenses yet. Add one below to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries())
              .sort((a, b) => {
                const ai = orderedCategoryIds.indexOf(a[0]);
                const bi = orderedCategoryIds.indexOf(b[0]);
                if (ai >= 0 && bi >= 0) return ai - bi;
                if (ai >= 0) return -1;
                if (bi >= 0) return 1;
                return a[0].localeCompare(b[0]);
              })
              .map(([categoryId, categoryEntries]) => {
                const total = categoryEntries.reduce((s, e) => s + e.amount, 0);
                const countedInCategory = freeTierLimitApplied
                  ? categoryEntries.filter((e) => countedEntryIds.has(e.id))
                  : categoryEntries;
                const catTotalCounted = countedInCategory.reduce((s, e) => s + e.amount, 0);
                const catPaidCounted = countedInCategory.reduce(
                  (s, e) => s + (paidIds.has(e.id) ? e.amount : 0),
                  0
                );
                const catPaidPct =
                  catTotalCounted > 0
                    ? Math.min(100, Math.round((catPaidCounted / catTotalCounted) * 100))
                    : 0;
                return (
                  <Card key={categoryId} className={cn("overflow-hidden", getCategoryBg(categoriesList, categoryId))}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{getCategoryLabel(categoriesList, categoryId)}</CardTitle>
                          <span className="text-xs text-muted-foreground">{categoryEntries.length} item{categoryEntries.length !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="text-lg font-bold tabular-nums">{formatCurrency(total)}</span>
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
                      {addingToCategory === categoryId && (
                        <form
                          onSubmit={handleAddToCategory}
                          className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3"
                        >
                          <div className="min-w-[140px] space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input placeholder="Optional label" className="h-8" value={addInlineName} onChange={(e) => setAddInlineName(e.target.value)} />
                          </div>
                          <div className="min-w-[140px] space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Select value={addInlineCategory} onValueChange={setAddInlineCategory}>
                              <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                              <SelectContent>
                                {categoriesList.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20 space-y-1">
                            <Label className="text-xs">Amount</Label>
                            <AmountInput placeholder="0" className="h-8 w-full" value={addInlineAmount} onChange={setAddInlineAmount} />
                          </div>
                          <div className="min-w-[130px] space-y-1">
                            <Label className="text-xs">Due date</Label>
                            <Input
                              type="date"
                              className="h-8"
                              title="Same calendar day each month"
                              value={addInlineDueDate}
                              onChange={(e) => setAddInlineDueDate(e.target.value)}
                            />
                          </div>
                          <ReminderDropdown days={addInlineReminderDays} onToggle={toggleInlineReminder} />
                          <Button type="submit" size="sm" disabled={addInlineStatus === "saving"}>
                            {addInlineStatus === "saving" ? "Adding…" : "Add"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={cancelAddToCategory}>Cancel</Button>
                        </form>
                      )}
                      <ul className="divide-y divide-border/50">
                        {categoryEntries.map((entry) => {
                          const isExcludedFromCount = freeTierLimitApplied && !countedEntryIds.has(entry.id);
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
                            className={cn(
                              "py-2.5 first:pt-0 last:pb-0 transition-[filter,opacity]",
                              isExcludedFromCount && "blur-[2px] opacity-60 pointer-events-none select-none text-muted-foreground"
                            )}
                          >
                            {editingId === entry.id ? (
                              <form onSubmit={handleSaveEdit} className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
                                <div className="min-w-[140px] space-y-1">
                                  <Label className="text-xs">Name</Label>
                                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Optional label" className="h-8" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <Label className="text-xs">Category</Label>
                                  <Select value={editCategory} onValueChange={setEditCategory}>
                                    <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {categoriesList.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-20 space-y-1">
                                  <Label className="text-xs">Amount</Label>
                                  <AmountInput value={editAmount} onChange={setEditAmount} className="h-8 w-full" />
                                </div>
                                <div className="min-w-[130px] space-y-1">
                                  <Label className="text-xs">Due date</Label>
                                  <Input
                                    type="date"
                                    className="h-8"
                                    title="Same calendar day each month"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                  />
                                </div>
                                <div className="flex items-end gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                    onClick={() => editingId && handleDeleteExpense(editingId)}
                                    disabled={editStatus === "saving" || deletingId !== null}
                                    aria-label="Remove expense"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <ReminderDropdown days={editReminderDays} onToggle={toggleEditReminder} />
                                </div>
                                <div className="flex gap-1">
                                  <Button type="submit" size="sm" disabled={editStatus === "saving"}>
                                    {editStatus === "saving" ? "Saving…" : "Save"}
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex flex-col gap-1 py-1">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    {inlineNameEditId === entry.id ? (
                                      <Input
                                        value={inlineNameDraft}
                                        onChange={(e) => setInlineNameDraft(e.target.value)}
                                        className="h-8 max-w-[min(100%,20rem)] text-sm font-medium"
                                        placeholder="Name"
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
                                          disabled={deletingId !== null || togglingPaidId === entry.id}
                                          onPointerDown={(e) => {
                                            if (inlineNameEditId === entry.id) e.preventDefault();
                                          }}
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-48">
                                        <DropdownMenuItem
                                          onSelect={() => {
                                            startEdit(entry);
                                          }}
                                        >
                                          Edit
                                        </DropdownMenuItem>
                                        {!paidIds.has(entry.id) ? (
                                          <DropdownMenuItem
                                            onSelect={() => {
                                              void togglePaid(entry.id);
                                            }}
                                            disabled={togglingPaidId === entry.id}
                                          >
                                            Mark as Paid
                                          </DropdownMenuItem>
                                        ) : (
                                          <DropdownMenuItem
                                            onSelect={() => {
                                              void togglePaid(entry.id);
                                            }}
                                            disabled={togglingPaidId === entry.id}
                                          >
                                            Mark as Unpaid
                                          </DropdownMenuItem>
                                        )}
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
                              </div>
                            )}
                          </li>
                          );
                        })}
                      </ul>
                      <div className="mt-3 flex justify-start">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => startAddToCategory(categoryId)}
                          disabled={addingToCategory === categoryId || !canAddMoreExpenses}
                          title={!canAddMoreExpenses ? `Free tier limited to ${FREE_TIER_EXPENSE_LIMIT} expenses. Subscribe to add more.` : undefined}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add expense
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>

      {/* ════════════════════ ADD EXPENSE CARD ════════════════════ */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Add expense</CardTitle>
              <CardDescription className="text-xs">
                {canAddMoreExpenses
                  ? "Add one or more expenses. You can add multiple of the same type."
                  : `Free tier is limited to ${FREE_TIER_EXPENSE_LIMIT} expenses. Subscribe to add more.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddExpense} className="space-y-3">
            {addLines.map((line) => (
              <div
                key={line.id}
                className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3"
              >
                <div className="min-w-[140px] space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input placeholder="Optional label" className="h-9" value={line.name} onChange={(e) => setAddLine(line.id, { name: e.target.value })} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={line.category} onValueChange={(v) => setAddLine(line.id, { category: v })}>
                    <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {categoriesList.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <AmountInput placeholder="0" className="h-9 w-full" value={line.amount} onChange={(raw) => setAddLine(line.id, { amount: raw })} />
                </div>
                <div className="min-w-[130px] space-y-1">
                  <Label className="text-xs">Due date</Label>
                  <Input
                    type="date"
                    className="h-9"
                    title="Same calendar day each month"
                    value={line.dueDate}
                    onChange={(e) => setAddLine(line.id, { dueDate: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeAddLine(line.id)}
                    disabled={addLines.length <= 1}
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ReminderDropdown
                    days={line.reminderDays}
                    onToggle={(day) => setLineReminder(line.id, day)}
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAddLine}
                disabled={!canAddMoreExpenses}
                title={!canAddMoreExpenses ? `Free tier limited to ${FREE_TIER_EXPENSE_LIMIT} expenses. Subscribe to add more.` : undefined}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add another row
              </Button>
              <Button
                type="submit"
                disabled={
                  addStatus === "saving" ||
                  !canAddMoreExpenses ||
                  !addLines.some(
                    (l) => l.category && (parseInt(l.amount.replace(/\D/g, ""), 10) || 0) > 0
                  )
                }
                title={!canAddMoreExpenses ? `Free tier limited to ${FREE_TIER_EXPENSE_LIMIT} expenses. Subscribe to add more.` : undefined}
              >
                {addStatus === "saving" ? "Adding…" : "Add all"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
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
