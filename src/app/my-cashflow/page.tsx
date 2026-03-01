"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { loadExpenseData, saveIncomeEntries, addExpense, updateExpense, deleteExpense } from "@/actions/budget";
import { FREE_TIER_EXPENSE_LIMIT } from "@/types/database.types";
import { useUser } from "@/hooks/use-user";
import { useBudgetRefresh } from "@/contexts/budget-refresh";
import type { ReminderDay } from "@/types/database.types";
import { EXPENSE_CATEGORIES, REMINDER_OPTIONS, INCOME_CATEGORIES } from "@/types/database.types";
import type { IncomeCategoryKey } from "@/types/database.types";
import type { ExpenseEntryRow } from "@/actions/budget";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { subscriptionPlanQueryOptions } from "@/lib/query/subscription-plan";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { Pencil, Plus, Trash2, Bell, Check, Sparkles } from "lucide-react";

type IncomeCardRow = { category_key: IncomeCategoryKey; amount: string };

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

export default function MyCashflowPage() {
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
  const [netTakeHome, setNetTakeHome] = useState(0);
  const [entries, setEntries] = useState<ExpenseEntryRow[]>([]);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [incomeCardRows, setIncomeCardRows] = useState<IncomeCardRow[]>(() => [{ category_key: "salary", amount: "" }]);
  const [addLines, setAddLines] = useState<AddExpenseLine[]>(() => [newAddLine()]);
  const { showError: showSnackbar } = useSnackbar();
  const { refreshBudget } = useBudgetRefresh();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
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

  const load = useCallback(() => {
    loadExpenseData().then((data) => {
      if (data) {
        setNetTakeHome(data.netTakeHome);
        setIsSubscriber(data.isSubscriber);
        setSubscriptionExpired(data.subscriptionExpired);
        if (data.netTakeHome === 0 && data.incomeEntries?.length > 0) {
          setIncomeCardRows(
            data.incomeEntries.map((e) => ({
              category_key: (e.category_key as IncomeCategoryKey) || "salary",
              amount: String(e.amount),
            }))
          );
        } else if (data.netTakeHome === 0) {
          setIncomeCardRows([{ category_key: "salary", amount: "" }]);
        }
        setEntries(data.entries);
      }
      setBudgetDataLoaded(true);
    }).catch(() => setBudgetDataLoaded(true));
  }, []);

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
  const balance = netTakeHome - totalExpenses;
  const grouped = groupEntriesByCategory(entries);
  const canAddMoreExpenses = isSubscriber || entries.length < FREE_TIER_EXPENSE_LIMIT;

  const incomeCardTotal = useMemo(
    () => incomeCardRows.reduce((s, r) => s + (parseInt(r.amount.replace(/\D/g, ""), 10) || 0), 0),
    [incomeCardRows]
  );

  function setIncomeCardRow(index: number, update: Partial<IncomeCardRow>) {
    setIncomeCardRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
  }

  function addIncomeCardRow() {
    setIncomeCardRows((prev) => [...prev, { category_key: "salary", amount: "" }]);
  }

  function removeIncomeCardRow(index: number) {
    setIncomeCardRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSaveNetTakeHome(e: React.FormEvent) {
    e.preventDefault();
    const rows = incomeCardRows.map((r) => ({
      category_key: r.category_key,
      amount: parseInt(r.amount.replace(/\D/g, ""), 10) || 0,
    }));
    const valid = rows.filter((r) => r.amount > 0);
    if (valid.length === 0) {
      showSnackbar("Add at least one income row with amount greater than 0.");
      return;
    }
    setSaveStatus("saving");
    const result = await saveIncomeEntries(valid);
    if (result.error) {
      showSnackbar(result.error);
      setSaveStatus("error");
    } else {
      const total = valid.reduce((s, r) => s + r.amount, 0);
      setNetTakeHome(total);
      setSaveStatus("saved");
      load();
      refreshBudget();
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }

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
    setEditingId(entry.id);
    setEditCategory(entry.category_id);
    setEditAmount(String(entry.amount));
    setEditName(entry.note ?? "");
    setEditDueDate(entry.due_date ?? "");
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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!budgetDataLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your cashflow…</p>
      </main>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="mb-2 text-2xl font-semibold">My Cashflow</h1>
      <p className="mb-6 text-muted-foreground">
        Set your take-home pay, then add expenses. Add another line anytime for expenses you forgot.
      </p>

      {/* Net take-home card: show only when not yet set (first time) */}
      {netTakeHome === 0 && (
        <Card className="mb-8 max-w-xl">
          <CardHeader>
            <CardTitle>Net take-home pay</CardTitle>
            <CardDescription>
              Add income by category. Total is shown below and saved when you click Save.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 px-4 py-3 mb-4">
              <p className="text-sm text-muted-foreground">Total (before save)</p>
              <p className="text-xl font-bold">{formatCurrency(incomeCardTotal)}</p>
            </div>
            <form onSubmit={handleSaveNetTakeHome} className="space-y-4">
              <div className="space-y-2">
                <Label>Income by category</Label>
                <div className="p-1 space-y-2 max-h-64 overflow-y-auto">
                  {incomeCardRows.map((row, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <Select
                        value={row.category_key}
                        onValueChange={(v) => setIncomeCardRow(index, { category_key: v as IncomeCategoryKey })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INCOME_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AmountInput
                        placeholder="0"
                        className="w-28"
                        value={row.amount}
                        onChange={(raw) => setIncomeCardRow(index, { amount: raw })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeIncomeCardRow(index)}
                        disabled={incomeCardRows.length <= 1}
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addIncomeCardRow} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add row
                </Button>
              </div>
              <Button type="submit" disabled={saveStatus === "saving"}>
                {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Grouped expenses (permanent) */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Expenses by category</h2>
        {entries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No expenses yet. Add one below.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
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
                return (
                  <Card key={categoryId} className={getCategoryBg(categoriesList, categoryId)}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">{getCategoryLabel(categoriesList, categoryId)}</CardTitle>
                        <Badge variant="secondary" className="bg-white dark:bg-white/90 font-bold text-lg px-3 py-1 text-zinc-900">
                          {formatCurrency(total)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {addingToCategory === categoryId && (
                        <form
                          onSubmit={handleAddToCategory}
                          className="mb-3 flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2"
                        >
                          <div className="min-w-[140px] space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              placeholder="Optional label"
                              className="h-8"
                              value={addInlineName}
                              onChange={(e) => setAddInlineName(e.target.value)}
                            />
                          </div>
                          <div className="min-w-[140px] space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Select value={addInlineCategory} onValueChange={setAddInlineCategory}>
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categoriesList.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20 space-y-1">
                            <Label className="text-xs">Amount (PHP)</Label>
                            <AmountInput
                              placeholder="0"
                              className="h-8 w-full"
                              value={addInlineAmount}
                              onChange={setAddInlineAmount}
                            />
                          </div>
                          <div className="min-w-[130px] space-y-1">
                            <Label className="text-xs">Due date</Label>
                            <Input
                              type="date"
                              className="h-8"
                              value={addInlineDueDate}
                              onChange={(e) => setAddInlineDueDate(e.target.value)}
                            />
                          </div>
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
                                {addInlineReminderDays.length > 0 && (
                                  <span className="text-xs">{formatReminderLabel(addInlineReminderDays)}</span>
                                )}
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
                                  checked={addInlineReminderDays.includes(opt.value)}
                                  onCheckedChange={() => toggleInlineReminder(opt.value)}
                                  disabled={!isSubscriber}
                                  className="w-full pl-6"
                                >
                                  {opt.value === 0 ? "On due date" : `${opt.value} days before`}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button type="submit" size="sm" disabled={addInlineStatus === "saving"}>
                            {addInlineStatus === "saving" ? "Adding…" : "Add"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={cancelAddToCategory}>
                            Cancel
                          </Button>
                        </form>
                      )}
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {categoryEntries.map((entry) => {
                          const isExcludedFromCount = freeTierLimitApplied && !countedEntryIds.has(entry.id);
                          return (
                          <li
                            key={entry.id}
                            className={cn(
                              "flex flex-col gap-2 transition-[filter,opacity]",
                              isExcludedFromCount && "blur-[2px] opacity-60 pointer-events-none select-none text-muted-foreground"
                            )}
                          >
                            {editingId === entry.id ? (
                              <form onSubmit={handleSaveEdit} className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-2">
                                <div className="min-w-[140px] space-y-1">
                                  <Label className="text-xs">Name</Label>
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Optional label"
                                    className="h-8"
                                  />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                  <Label className="text-xs">Category</Label>
                                  <Select value={editCategory} onValueChange={setEditCategory}>
                                    <SelectTrigger className="h-8 w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categoriesList.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                          {cat.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-20 space-y-1">
                                  <Label className="text-xs">Amount (PHP)</Label>
                                  <AmountInput
                                    value={editAmount}
                                    onChange={setEditAmount}
                                    className="h-8 w-full"
                                  />
                                </div>
                                <div className="min-w-[130px] space-y-1">
                                  <Label className="text-xs">Due date</Label>
                                  <Input
                                    type="date"
                                    className="h-8"
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
                                        {editReminderDays.length > 0 && (
                                          <span className="text-xs">{formatReminderLabel(editReminderDays)}</span>
                                        )}
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
                                          checked={editReminderDays.includes(opt.value)}
                                          onCheckedChange={() => toggleEditReminder(opt.value)}
                                          disabled={!isSubscriber}
                                          className="w-full pl-6"
                                        >
                                          {opt.value === 0 ? "On due date" : `${opt.value} days before`}
                                        </DropdownMenuCheckboxItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex gap-1">
                                  <Button type="submit" size="sm" disabled={editStatus === "saving"}>
                                    {editStatus === "saving" ? "Saving…" : "Save"}
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span>{entry.note ? entry.note : getCategoryLabel(categoriesList, entry.category_id)}</span>
                                  <span className="shrink-0 font-bold">{formatCurrency(entry.amount)}</span>
                                  {entry.due_date && (
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      Due: {new Date(entry.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => startEdit(entry)}
                                    aria-label="Edit expense"
                                    disabled={deletingId !== null}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteExpense(entry.id)}
                                    disabled={deletingId !== null}
                                    aria-label="Remove expense"
                                  >
                                    {deletingId === entry.id ? (
                                      <span className="text-xs">…</span>
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                  {entry.due_date && (
                                    <span className="flex shrink-0 items-center gap-1 px-1 text-xs text-muted-foreground" title="Reminders">
                                      <Bell className="h-3.5 w-3.5" />
                                      {(entry.reminder_days_before?.length ?? 0) > 0 ? (
                                        formatReminderLabel(entry.reminder_days_before ?? [])
                                      ) : (
                                        "—"
                                      )}
                                    </span>
                                  )}
                                </div>
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
                          onClick={() => startAddToCategory(categoryId)}
                          disabled={addingToCategory === categoryId || !canAddMoreExpenses}
                          title={!canAddMoreExpenses ? `Free tier limited to ${FREE_TIER_EXPENSE_LIMIT} expenses. Subscribe to add more.` : undefined}
                        >
                          <Plus className="mr-1 h-4 w-4" />
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

      {/* Add expense – multiple lines */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add expense</CardTitle>
          <CardDescription>
            {canAddMoreExpenses
              ? "Add one or more expenses. You can add multiple of the same type."
              : `Free tier is limited to ${FREE_TIER_EXPENSE_LIMIT} expenses. Subscribe to add more.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddExpense} className="space-y-3">
            {addLines.map((line) => (
              <div
                key={line.id}
                className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/20 p-2"
              >
                <div className="min-w-[140px] space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="Optional label"
                    className="h-9"
                    value={line.name}
                    onChange={(e) => setAddLine(line.id, { name: e.target.value })}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={line.category}
                    onValueChange={(v) => setAddLine(line.id, { category: v })}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesList.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Amount (PHP)</Label>
                  <AmountInput
                    placeholder="0"
                    className="h-9 w-full"
                    value={line.amount}
                    onChange={(raw) => setAddLine(line.id, { amount: raw })}
                  />
                </div>
                <div className="min-w-[130px] space-y-1">
                  <Label className="text-xs">Due date</Label>
                  <Input
                    type="date"
                    className="h-9"
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 gap-1 px-2"
                        aria-label="Reminders"
                      >
                        <Bell className="h-4 w-4" />
                        {line.reminderDays.length > 0 && (
                          <span className="text-xs">{formatReminderLabel(line.reminderDays)}</span>
                        )}
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
                          checked={line.reminderDays.includes(opt.value)}
                          onCheckedChange={() => setLineReminder(line.id, opt.value)}
                          disabled={!isSubscriber}
                          className="w-full pl-6"
                        >
                          {opt.value === 0 ? "On due date" : `${opt.value} days before`}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            {freeTierLimitApplied
              ? `Only first ${FREE_TIER_EXPENSE_LIMIT} expenses (by date added) count toward this total. Subscribe to include all.`
              : "Total expenses vs take-home."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {freeTierLimitApplied && (
            <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-sm text-amber-800 dark:text-amber-200">
              {FREE_TIER_EXPENSE_LIMIT} of {entries.length} expenses included (free tier). Status above is not accurate for full budget.
            </p>
          )}
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">Net take-home</span>
            <span className="font-bold">{formatCurrency(netTakeHome)}</span>
          </p>
          <p className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total expenses</span>
            <span className="font-bold">{formatCurrency(totalExpenses)}</span>
          </p>
          <p className="flex justify-between font-semibold">
            <span>Balance</span>
            <span className={cn("font-bold", balance < 0 ? "text-destructive" : balance > 0 ? "text-emerald-600" : "")}>
              {balance < 0 ? "-" : ""}{formatCurrency(Math.abs(balance))}
              {balance < 0 && " (overdraft)"}
              {balance > 0 && " (left over)"}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Subscribe for more – again at bottom of My Cashflow so it’s visible after scrolling */}
      {subscriptionExpired && (
        <Card className="mx-auto mt-8 max-w-2xl border-primary/50 bg-primary/5 shadow-sm relative overflow-hidden">
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
              <Link href="/payment" className="flex items-center justify-center gap-2">
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
