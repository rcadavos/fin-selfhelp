"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadExpenseData, updateNetTakeHome, addExpense, updateExpense, deleteExpense } from "@/actions/budget";
import { FREE_TIER_EXPENSE_LIMIT } from "@/types/database.types";
import { useUser } from "@/hooks/use-user";
import { useBudgetRefresh } from "@/contexts/budget-refresh";
import type { ExpenseCategoryKey, ReminderDay } from "@/types/database.types";
import { EXPENSE_CATEGORIES, REMINDER_OPTIONS } from "@/types/database.types";
import type { ExpenseEntryRow } from "@/actions/budget";
import { formatCurrency, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { Pencil, Plus, Trash2, Bell } from "lucide-react";

type AddExpenseLine = { id: string; category: ExpenseCategoryKey | ""; amount: string; name: string; dueDate: string; reminderDays: ReminderDay[] };
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
  const map = new Map<ExpenseCategoryKey, ExpenseEntryRow[]>();
  for (const entry of entries) {
    const list = map.get(entry.category_id) ?? [];
    list.push(entry);
    map.set(entry.category_id, list);
  }
  return map;
}

function getCategoryLabel(id: ExpenseCategoryKey): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [netTakeHome, setNetTakeHome] = useState(0);
  const [entries, setEntries] = useState<ExpenseEntryRow[]>([]);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [netTakeHomeInput, setNetTakeHomeInput] = useState("");
  const [addLines, setAddLines] = useState<AddExpenseLine[]>(() => [newAddLine()]);
  const { showError: showSnackbar } = useSnackbar();
  const { refreshBudget } = useBudgetRefresh();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [addStatus, setAddStatus] = useState<"idle" | "saving" | "error">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<ExpenseCategoryKey | "">("");
  const [editAmount, setEditAmount] = useState("");
  const [editName, setEditName] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editReminderDays, setEditReminderDays] = useState<ReminderDay[]>([]);
  const [editStatus, setEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [addingToCategory, setAddingToCategory] = useState<ExpenseCategoryKey | null>(null);
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
        setNetTakeHomeInput(data.netTakeHome > 0 ? String(data.netTakeHome) : "");
        setEntries(data.entries);
      }
    });
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

  async function handleSaveNetTakeHome() {
    const value = parseInt(netTakeHomeInput.replace(/\D/g, ""), 10) || 0;
    setSaveStatus("saving");
    const result = await updateNetTakeHome(value);
    if (result.error) {
      showSnackbar(result.error);
      setSaveStatus("error");
    } else {
      setNetTakeHome(value);
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
        category: line.category as ExpenseCategoryKey,
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
      editCategory as ExpenseCategoryKey,
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

  function startAddToCategory(categoryId: ExpenseCategoryKey) {
    setAddingToCategory(categoryId);
    setAddInlineAmount("");
    setAddInlineName("");
    setAddInlineDueDate("");
    setAddInlineReminderDays([]);
    setAddInlineStatus("idle");
  }

  function cancelAddToCategory() {
    setAddingToCategory(null);
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
      load();
      refreshBudget();
    }
    setDeletingId(null);
  }

  async function handleAddToCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!addingToCategory) return;
    const amount = parseInt(addInlineAmount.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) return;
    setAddInlineStatus("saving");
    const reminderDays =
      isSubscriber && addInlineDueDate.trim() && addInlineReminderDays.length
        ? addInlineReminderDays
        : undefined;
    const result = await addExpense(
      addingToCategory,
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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="mb-2 text-2xl font-semibold">My budget</h1>
      <p className="mb-6 text-muted-foreground">
        Set your take-home pay, then add expenses. Add another line anytime for expenses you forgot.
      </p>

      {/* Subscribe for more – visible to free-tier users, sets expectation before they hit limits */}
      {!isSubscriber && (
        <Card className="mb-8 border-dashed bg-muted/20">
          <CardHeader>
            <CardTitle className="text-lg">Subscribe for more</CardTitle>
            <CardDescription>
              Unlock due-date reminders and more. Subscribers get:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Due-date reminders</strong> — Get notified 3 days, 1 day, and on the day an expense is due (e.g. bills, loans).</li>
              <li><strong className="text-foreground">Export budget</strong> — Download your budget and expenses (CSV/PDF) for records or tax prep.</li>
              <li><strong className="text-foreground">Multiple budgets</strong> — Separate budgets for personal, side gig, or family.</li>
              <li><strong className="text-foreground">Priority support</strong> — Quick help when you need it.</li>
            </ul>
            <p className="pt-2 text-xs text-muted-foreground">
              Reminder options and more than 5 expenses require a subscription. Pricing and sign-up coming soon.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Net take-home card: show only when not yet set (first time) */}
      {netTakeHome === 0 && (
        <Card className="mb-8 max-w-xl">
          <CardHeader>
            <CardTitle>Net take-home pay</CardTitle>
            <CardDescription>Your monthly income after tax and deductions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-2 min-w-[140px]">
              <Label htmlFor="net">Amount (PHP)</Label>
              <Input
                id="net"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={netTakeHomeInput}
                onChange={(e) => setNetTakeHomeInput(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <Button
              type="button"
              onClick={handleSaveNetTakeHome}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}
            </Button>
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
              .sort((a, b) => getCategoryLabel(a[0]).localeCompare(getCategoryLabel(b[0])))
              .map(([categoryId, categoryEntries]) => {
                const total = categoryEntries.reduce((s, e) => s + e.amount, 0);
                return (
                  <Card key={categoryId}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">{getCategoryLabel(categoryId)}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-bold">{formatCurrency(total)}</Badge>
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
                          <div className="min-w-[100px] space-y-1">
                            <Label className="text-xs">Amount (PHP)</Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              className="h-8"
                              value={addInlineAmount}
                              onChange={(e) => setAddInlineAmount(e.target.value.replace(/\D/g, ""))}
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
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs flex items-center gap-1">
                                <Bell className="h-3.5 w-3.5" />
                                Reminders
                                {!isSubscriber && (
                                  <span className="text-muted-foreground font-normal" title="Subscribe to enable reminders">
                                    (subscribe to enable)
                                  </span>
                                )}
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {REMINDER_OPTIONS.map((opt) => (
                                  <label
                                    key={opt.value}
                                    className={cn(
                                      "flex items-center gap-1 text-xs",
                                      !isSubscriber && "cursor-not-allowed opacity-60"
                                    )}
                                    title={!isSubscriber ? "Subscribe to enable reminders" : undefined}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={addInlineReminderDays.includes(opt.value)}
                                      onChange={() => toggleInlineReminder(opt.value)}
                                      disabled={!isSubscriber}
                                      className="rounded"
                                    />
                                    {opt.value === 0 ? "Due" : `${opt.value}d`}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
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
                              "flex flex-col gap-2",
                              isExcludedFromCount && "opacity-50 text-muted-foreground"
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
                                <div className="min-w-[120px] space-y-1">
                                  <Label className="text-xs">Category</Label>
                                  <Select value={editCategory} onValueChange={(v) => setEditCategory(v as ExpenseCategoryKey)}>
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {EXPENSE_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                          {cat.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="min-w-[100px] space-y-1">
                                  <Label className="text-xs">Amount (PHP)</Label>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value.replace(/\D/g, ""))}
                                    className="h-8"
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
                                <div className="flex flex-wrap items-end gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs flex items-center gap-1">
                                      <Bell className="h-3.5 w-3.5" />
                                      Reminders
                                      {!isSubscriber && (
                                        <span className="text-muted-foreground font-normal" title="Subscribe to enable reminders">
                                          (subscribe to enable)
                                        </span>
                                      )}
                                    </Label>
                                    <div className="flex flex-wrap gap-2">
                                      {REMINDER_OPTIONS.map((opt) => (
                                        <label
                                          key={opt.value}
                                          className={cn(
                                            "flex items-center gap-1 text-xs",
                                            !isSubscriber && "cursor-not-allowed opacity-60"
                                          )}
                                          title={!isSubscriber ? "Subscribe to enable reminders" : undefined}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={editReminderDays.includes(opt.value)}
                                            onChange={() => toggleEditReminder(opt.value)}
                                            disabled={!isSubscriber}
                                            className="rounded"
                                          />
                                          {opt.value === 0 ? "Due" : `${opt.value}d`}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
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
                                  <span>{entry.note ? entry.note : getCategoryLabel(entry.category_id)}</span>
                                  <span className="shrink-0 font-bold">{formatCurrency(entry.amount)}</span>
                                  {entry.due_date && (
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      Due: {new Date(entry.due_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                  )}
                                  {(entry.reminder_days_before?.length ?? 0) > 0 && (
                                    <span className="shrink-0 text-xs text-muted-foreground flex items-center gap-1">
                                      <Bell className="h-3 w-3" />
                                      {formatReminderLabel(entry.reminder_days_before ?? [])}
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
                                </div>
                              </div>
                            )}
                          </li>
                          );
                        })}
                      </ul>
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
                <div className="min-w-[160px] space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={line.category}
                    onValueChange={(v) => setAddLine(line.id, { category: v as ExpenseCategoryKey })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[100px] space-y-1">
                  <Label className="text-xs">Amount (PHP)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="h-9"
                    value={line.amount}
                    onChange={(e) =>
                      setAddLine(line.id, { amount: e.target.value.replace(/\D/g, "") })
                    }
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
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Bell className="h-3.5 w-3.5" />
                      Reminders
                      {!isSubscriber && (
                        <span className="text-muted-foreground font-normal" title="Subscribe to enable reminders">
                          (subscribe to enable)
                        </span>
                      )}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {REMINDER_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex items-center gap-1 text-xs",
                            !isSubscriber && "cursor-not-allowed opacity-60"
                          )}
                          title={!isSubscriber ? "Subscribe to enable reminders" : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={line.reminderDays.includes(opt.value)}
                            onChange={() => setLineReminder(line.id, opt.value)}
                            disabled={!isSubscriber}
                            className="rounded"
                          />
                          {opt.value === 0 ? "Due" : `${opt.value}d`}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
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

      {/* Subscribe for more – again at bottom of My budget so it’s visible after scrolling */}
      {!isSubscriber && (
        <Card className="mt-8 border-dashed bg-muted/20">
          <CardHeader>
            <CardTitle className="text-lg">Subscribe for more</CardTitle>
            <CardDescription>
              Unlock due-date reminders and more. Subscribers get:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Due-date reminders</strong> — Get notified 3 days, 1 day, and on the day an expense is due (e.g. bills, loans).</li>
              <li><strong className="text-foreground">Export budget</strong> — Download your budget and expenses (CSV/PDF) for records or tax prep.</li>
              <li><strong className="text-foreground">Multiple budgets</strong> — Separate budgets for personal, side gig, or family.</li>
              <li><strong className="text-foreground">Priority support</strong> — Quick help when you need it.</li>
            </ul>
            <p className="pt-2 text-xs text-muted-foreground">
              Reminder options and more than 5 expenses require a subscription. Pricing and sign-up coming soon.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
