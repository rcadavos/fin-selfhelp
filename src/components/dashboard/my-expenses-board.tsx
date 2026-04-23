"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Download,
  GripVertical,
  LayoutGrid,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { addExpense, deleteExpense, updateExpense, type ExpenseEntryRow } from "@/actions/budget";
import { type ReminderDay, REMINDER_OPTIONS } from "@/types/database.types";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import { toggleExpensePayment } from "@/actions/expense-payments";
import { useUser } from "@/hooks/use-user";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import { expenseDataQueryOptions } from "@/lib/query/expenses";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { getDueDayOfMonthFromYmd, formatYmdLocal, effectiveDueDateInPaidMonth } from "@/lib/expense-due-date";
import { formatCurrency, cn } from "@/lib/utils";
import { CURRENCY_OPTIONS, DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_BILL_ORDER = "expenses-board-bill-order-v1";

// Maps Tailwind color names (from bgClass like "bg-lime-50 ...") to vivid hex dots.
const TAILWIND_DOT_COLORS: Record<string, string> = {
  amber: "#f59e0b",
  sky: "#0ea5e9",
  slate: "#64748b",
  emerald: "#10b981",
  rose: "#f43f5e",
  green: "#22c55e",
  violet: "#8b5cf6",
  orange: "#f97316",
  teal: "#14b8a6",
  indigo: "#6366f1",
  pink: "#ec4899",
  cyan: "#06b6d4",
  fuchsia: "#d946ef",
  lime: "#84cc16",
  blue: "#3b82f6",
  neutral: "#9ca3af",
  red: "#ef4444",
  yellow: "#eab308",
  purple: "#a855f7",
};

function colorFromBgClass(bgClass: string): string {
  const m = bgClass.match(/bg-([a-z]+)-/);
  return (m && TAILWIND_DOT_COLORS[m[1]]) ?? "#9ca3af";
}

function getCategoryColor(id: string, categories: CatList): string {
  const cat = categories.find((c) => c.id === id);
  return cat?.bgClass ? colorFromBgClass(cat.bgClass) : "#9ca3af";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CatList = Array<{ id: string; label: string; bgClass: string }>;

type BillStatus = "paid" | "outstanding" | "unpaid";

function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

function getBillStatus(bill: ExpenseEntryRow, isPaid: boolean, paidMonthYm: string): BillStatus {
  if (isPaid) return "paid";
  if (!bill.due_date) return "unpaid";
  const due = effectiveDueDateInPaidMonth(bill.due_date, paidMonthYm);
  if (!due) return "unpaid";
  if (due < startOfTodayLocal()) return "outstanding";
  return "unpaid";
}

function getCategoryLabel(id: string, categories: CatList): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}

function getEntryName(entry: ExpenseEntryRow, categories: CatList): string {
  return (
    entry.note?.trim() ||
    entry.notes?.trim() ||
    getCategoryLabel(entry.category_id, categories)
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportBoardToCSV(
  expenses: ExpenseEntryRow[],
  bills: ExpenseEntryRow[],
  categories: CatList,
  paidIds: Set<string>,
  paidMonth: string
): void {
  const headers = ["Name", "Type", "Category", "Amount", "Billing Period", "Status", "Due Date", "Date"];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [...expenses, ...bills].map((e) => {
    const name = e.note?.trim() || e.notes?.trim() || getCategoryLabel(e.category_id, categories);
    const type = e.due_date ? "Bill" : "Expense";
    const status = e.due_date
      ? paidIds.has(e.id) ? "Paid" : getBillStatus(e, false, paidMonth) === "outstanding" ? "Outstanding" : "Unpaid"
      : "";
    const dueDate = e.due_date ? effectiveDueDateInPaidMonth(e.due_date, paidMonth)?.toLocaleDateString("en-PH") ?? "" : "";
    const date = e.created_at ? e.created_at.slice(0, 10) : "";
    return [esc(name), type, esc(getCategoryLabel(e.category_id, categories)), e.amount, e.billing_period, status, dueDate, date].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
    download: `my-expenses-${new Date().toISOString().slice(0, 10)}.csv`,
    style: "display:none",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportBoardToExcel(
  expenses: ExpenseEntryRow[],
  bills: ExpenseEntryRow[],
  categories: CatList,
  paidIds: Set<string>,
  paidMonth: string
): void {
  const headers = ["Name", "Type", "Category", "Amount", "Billing Period", "Status", "Due Date", "Date"];
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headerRow = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const dataRows = [...expenses, ...bills].map((e) => {
    const name = e.note?.trim() || e.notes?.trim() || getCategoryLabel(e.category_id, categories);
    const type = e.due_date ? "Bill" : "Expense";
    const status = e.due_date
      ? paidIds.has(e.id) ? "Paid" : getBillStatus(e, false, paidMonth) === "outstanding" ? "Outstanding" : "Unpaid"
      : "";
    const dueDate = e.due_date ? effectiveDueDateInPaidMonth(e.due_date, paidMonth)?.toLocaleDateString("en-PH") ?? "" : "";
    const date = e.created_at ? e.created_at.slice(0, 10) : "";
    return `<tr>${[name, type, getCategoryLabel(e.category_id, categories), e.amount, e.billing_period, status, dueDate, date].map((v) => `<td>${esc(String(v))}</td>`).join("")}</tr>`;
  }).join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table><tr>${headerRow}</tr>${dataRows}</table></body></html>`;
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" })),
    download: `my-expenses-${new Date().toISOString().slice(0, 10)}.xls`,
    style: "display:none",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatDueDate(dateStr: string, paidMonthYm: string): string {
  const d = effectiveDueDateInPaidMonth(dateStr, paidMonthYm);
  if (!d) return "";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatShortDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function getExpenseDateLabel(entry: ExpenseEntryRow): string {
  if (!entry.created_at) return "";
  return formatShortDate(entry.created_at);
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Shared pie label renderer ────────────────────────────────────────────────

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

// ─── Expense Pie Chart ────────────────────────────────────────────────────────

function ExpensePieChart({ entries, categories }: { entries: ExpenseEntryRow[]; categories: CatList }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.category_id, (map.get(e.category_id) ?? 0) + e.amount);
    return Array.from(map.entries())
      .map(([id, value]) => ({
        name: getCategoryLabel(id, categories),
        value,
        color: getCategoryColor(id, categories),
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [entries, categories]);

  if (!data.length) return null;

  return (
    <div className="[&_svg]:outline-none">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart style={{ outline: "none" }}>
          <Pie
            style={{ outline: "none" }}
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            labelLine={false}
            label={PiePercentLabel}
          >
            {data.map((d, i) => (
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
    </div>
  );
}

// ─── Bills Pie Chart ──────────────────────────────────────────────────────────

function BillsPieChart({
  bills,
  paidIds,
}: {
  bills: ExpenseEntryRow[];
  paidIds: Set<string>;
}) {
  const data = useMemo(() => {
    const paid = bills.filter((b) => paidIds.has(b.id)).reduce((s, b) => s + b.amount, 0);
    const unpaid = bills.filter((b) => !paidIds.has(b.id)).reduce((s, b) => s + b.amount, 0);
    return [
      { name: "Paid", value: paid, color: "#10b981" },
      { name: "Unpaid", value: unpaid, color: "#f97316" },
    ].filter((d) => d.value > 0);
  }, [bills, paidIds]);

  if (!data.length) return null;

  return (
    <div className="[&_svg]:outline-none">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart style={{ outline: "none" }}>
          <Pie
            style={{ outline: "none" }}
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            labelLine={false}
            label={PiePercentLabel}
          >
            {data.map((d, i) => (
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
    </div>
  );
}

// ─── Sortable Bill Card ───────────────────────────────────────────────────────

function SortableBillCard({
  bill,
  isPaid,
  status,
  onTogglePaid,
  onDelete,
  onEdit,
  categories,
  paidMonth,
}: {
  bill: ExpenseEntryRow;
  isPaid: boolean;
  status: BillStatus;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: ExpenseEntryRow) => void;
  categories: CatList;
  paidMonth: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bill.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const color = getCategoryColor(bill.category_id, categories);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => onEdit(bill)}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm transition-shadow select-none",
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary/30 z-50" : "hover:shadow-md hover:border-primary/30"
      )}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Category dot */}
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-sm font-medium leading-tight",
              isPaid && "line-through text-muted-foreground"
            )}
          >
            {getEntryName(bill, categories)}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "flex-shrink-0 text-[10px] font-medium",
              status === "paid"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : status === "outstanding"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-amber-100"
                  : "text-muted-foreground"
            )}
          >
            {status === "paid" ? "Paid" : status === "outstanding" ? "Outstanding" : "Unpaid"}
          </Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {getCategoryLabel(bill.category_id, categories)}
          {bill.due_date && (
            <span className="ml-1.5">· Due {formatDueDate(bill.due_date, paidMonth)}</span>
          )}
        </p>
      </div>

      {/* Amount */}
      <span
        className={cn(
          "flex-shrink-0 text-sm font-semibold tabular-nums",
          isPaid ? "text-muted-foreground line-through" : "text-foreground"
        )}
      >
        {formatCurrency(bill.amount)}
      </span>

      {/* Paid toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onTogglePaid(bill.id); }}
        className={cn(
          "flex-shrink-0 rounded-full p-1 transition-colors",
          isPaid
            ? "text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
            : "text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground"
        )}
        title={isPaid ? "Mark unpaid" : "Mark paid"}
      >
        {isPaid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(bill.id); }}
        className="flex-shrink-0 rounded-full p-1 text-muted-foreground/40 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
        title="Delete bill"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function MyExpensesBoard() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();

  const { data: expenseData, isLoading } = useQuery(expenseDataQueryOptions());
  const { data: dbCategories = [] } = useQuery(categoriesQueryOptions());
  const { data: capabilities } = useQuery(subscriptionCapabilitiesQueryOptions());
  const categories = useMemo(
    () => (dbCategories.length > 0 ? dbCategories : EXPENSE_CATEGORIES),
    [dbCategories]
  );
  const paidMonth = expenseData?.paidMonth ?? getCurrentPaidMonth();
  const paidIds = useMemo(
    () => new Set(expenseData?.paidEntryIds ?? []),
    [expenseData]
  );
  const allEntries: ExpenseEntryRow[] = expenseData?.entries ?? [];

  // Expenses = no due date, Bills = has due date
  const expenses = useMemo(
    () =>
      allEntries
        .filter((e) => !e.due_date)
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }),
    [allEntries]
  );
  const billsRaw = useMemo(() => allEntries.filter((e) => !!e.due_date), [allEntries]);

  // Summary totals
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalBills = useMemo(() => billsRaw.reduce((s, b) => s + b.amount, 0), [billsRaw]);
  const paidBillsCount = useMemo(() => billsRaw.filter((b) => paidIds.has(b.id)).length, [billsRaw, paidIds]);
  const monthDisplay = useMemo(
    () => new Date(paidMonth + "-02").toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
    [paidMonth]
  );

  const expensesToday = useMemo(() => {
    const today = startOfTodayLocal();
    const todayTime = today.getTime();
    return allEntries.filter((e) => {
      if (e.due_date) {
        const due = effectiveDueDateInPaidMonth(e.due_date, paidMonth);
        return due && due.getTime() === todayTime;
      } else {
        if (!e.created_at) return false;
        const created = new Date(e.created_at);
        const createdFloor = new Date(created.getFullYear(), created.getMonth(), created.getDate());
        return createdFloor.getTime() === todayTime;
      }
    });
  }, [allEntries, paidMonth]);

  const totalToday = useMemo(() => expensesToday.reduce((s, e) => s + e.amount, 0), [expensesToday]);

  // Bill drag order persisted to localStorage
  const [billOrder, setBillOrder] = useState<string[]>([]);
  const orderLoaded = useRef(false);

  useEffect(() => {
    if (orderLoaded.current) return;
    orderLoaded.current = true;
    try {
      const saved = localStorage.getItem(LS_BILL_ORDER);
      if (saved) setBillOrder(JSON.parse(saved) as string[]);
    } catch { }
  }, []);

  const orderedBills = useMemo(() => {
    const bills = [...billsRaw];
    if (billOrder.length) {
      const rankOf = new Map(billOrder.map((id, i) => [id, i]));
      bills.sort((a, b) => (rankOf.get(a.id) ?? 9999) - (rankOf.get(b.id) ?? 9999));
    } else {
      // Default: sort by effective due date ascending within each group
      bills.sort((a, b) => {
        const da = a.due_date
          ? (effectiveDueDateInPaidMonth(a.due_date, paidMonth)?.getTime() ?? Infinity)
          : Infinity;
        const db = b.due_date
          ? (effectiveDueDateInPaidMonth(b.due_date, paidMonth)?.getTime() ?? Infinity)
          : Infinity;
        return da - db;
      });
    }
    // Always pin paid bills to the bottom (stable secondary sort)
    return bills.sort((a, b) => (paidIds.has(a.id) ? 1 : 0) - (paidIds.has(b.id) ? 1 : 0));
  }, [billsRaw, billOrder, paidIds, paidMonth]);

  // ── Quick-add expense state ──
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expDate, setExpDate] = useState(todayYmd);
  const [expSaving, setExpSaving] = useState(false);
  const [showSummaryMobile, setShowSummaryMobile] = useState(false);
  const expNameRef = useRef<HTMLInputElement>(null);

  // ── Bill filter + add state ──
  const [billPeriodFilter, setBillPeriodFilter] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [showBillForm, setShowBillForm] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billCategory, setBillCategory] = useState("other");
  const [billDue, setBillDue] = useState("");
  const [billSaving, setBillSaving] = useState(false);

  // ── Error banner ──
  const [error, setError] = useState<string | null>(null);

  // ── Edit modal state ──
  const [editingEntry, setEditingEntry] = useState<ExpenseEntryRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editReminders, setEditReminders] = useState<ReminderDay[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!userLoading && !user) router.replace("/login");
  }, [user, userLoading, router]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.expenseData(paidMonth) });
  }, [queryClient, paidMonth]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Handlers ──

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const name = expName.trim();
    const amt = parseFloat(expAmount);
    if (!name || isNaN(amt) || amt <= 0) {
      setError("Please enter a name and an amount greater than 0.");
      return;
    }

    // Snapshot for rollback
    const queryKey = queryKeys.expenseData(paidMonth);
    const snapshot = queryClient.getQueryData(queryKey);

    // Optimistic entry
    const optimisticEntry: ExpenseEntryRow = {
      id: `optimistic-${Date.now()}`,
      category_id: expCategory || "other",
      amount: amt,
      billing_period: "monthly",
      note: name,
      notes: null,
      due_date: null,
      created_at: `${expDate}T00:00:00`,
    };
    queryClient.setQueryData<import("@/actions/budget").ExpenseData | null>(queryKey, (old) =>
      old ? { ...old, entries: [...old.entries, optimisticEntry] } : old
    );

    // Reset form immediately
    const savedName = expName;
    const savedAmount = expAmount;
    const savedCategory = expCategory;
    const savedDate = expDate;
    setExpName("");
    setExpAmount("");
    setExpCategory("");
    setExpDate(todayYmd());
    setError(null);
    setExpSaving(true);

    const res = await addExpense(
      savedCategory || "other", amt, savedName,
      null, null, null, "monthly", "both", savedDate
    );
    setExpSaving(false);
    if (res.error) {
      setError(res.error);
      queryClient.setQueryData(queryKey, snapshot);
      setExpName(savedName);
      setExpAmount(savedAmount);
      setExpCategory(savedCategory);
      setExpDate(savedDate);
    } else {
      invalidate();
      expNameRef.current?.focus();
    }
  }

  async function handleAddBill(e: React.FormEvent) {
    e.preventDefault();
    const name = billName.trim();
    const amt = parseFloat(billAmount);
    if (!name || isNaN(amt) || amt <= 0 || !billDue) {
      setError("Please fill in all bill fields.");
      return;
    }

    // Snapshot for rollback
    const queryKey = queryKeys.expenseData(paidMonth);
    const snapshot = queryClient.getQueryData(queryKey);

    // Optimistic entry
    const optimisticEntry: ExpenseEntryRow = {
      id: `optimistic-${Date.now()}`,
      category_id: billCategory || "other",
      amount: amt,
      billing_period: billPeriodFilter,
      note: name,
      notes: null,
      due_date: billDue,
      created_at: new Date().toISOString(),
    };
    queryClient.setQueryData<import("@/actions/budget").ExpenseData | null>(queryKey, (old) =>
      old ? { ...old, entries: [...old.entries, optimisticEntry] } : old
    );

    // Close modal and reset immediately
    setShowBillForm(false);
    const savedName = billName;
    const savedAmount = billAmount;
    const savedCategory = billCategory;
    const savedDue = billDue;
    setBillName("");
    setBillAmount("");
    setBillCategory("");
    setBillDue("");
    setError(null);
    setBillSaving(true);

    const res = await addExpense(savedCategory || "other", amt, savedName, null, savedDue, null, billPeriodFilter);
    setBillSaving(false);
    if (res.error) {
      setError(res.error);
      queryClient.setQueryData(queryKey, snapshot);
      setBillName(savedName);
      setBillAmount(savedAmount);
      setBillCategory(savedCategory);
      setBillDue(savedDue);
      setShowBillForm(true);
    } else {
      invalidate();
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await deleteExpense(id);
    if (res.error) setError(res.error);
    else invalidate();
  }

  async function handleTogglePaid(id: string) {
    await toggleExpensePayment(id, paidMonth);
    invalidate();
  }

  function handleOpenEdit(entry: ExpenseEntryRow) {
    setEditingEntry(entry);
    setEditName(entry.note?.trim() || "");
    setEditAmount(String(entry.amount));
    setEditCategory(entry.category_id);
    setEditNote(entry.notes?.trim() || "");
    setEditExpenseDate(entry.created_at ? entry.created_at.slice(0, 10) : todayYmd());
    setEditReminders((entry.reminder_days_before ?? []) as ReminderDay[]);
    // due_date is stored as 1970-01-DD (day-of-month only). Show it in the
    // current month so the date picker doesn't open on January 1970.
    if (entry.due_date) {
      const day = getDueDayOfMonthFromYmd(entry.due_date);
      if (day) {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const d = new Date(now.getFullYear(), now.getMonth(), Math.min(day, lastDay));
        setEditDueDate(formatYmdLocal(d));
      } else {
        setEditDueDate("");
      }
    } else {
      setEditDueDate("");
    }
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;
    const name = editName.trim();
    const amt = parseFloat(editAmount);
    if (!name || isNaN(amt) || amt <= 0) {
      setEditError("Please enter a name and a valid amount.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    const res = await updateExpense(
      editingEntry.id,
      editCategory,
      amt,
      name,
      editNote.trim() || null,
      editingEntry.due_date !== undefined ? (editDueDate || null) : undefined,
      editReminders.length ? editReminders : null,
      undefined,
      undefined,
      !editingEntry.due_date ? editExpenseDate : undefined
    );
    setEditSaving(false);
    if (res.error) {
      setEditError(res.error);
    } else {
      setEditingEntry(null);
      invalidate();
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = orderedBills.map((b) => b.id);
    const newOrder = arrayMove(
      ids,
      ids.indexOf(active.id as string),
      ids.indexOf(over.id as string)
    );
    setBillOrder(newOrder);
    try {
      localStorage.setItem(LS_BILL_ORDER, JSON.stringify(newOrder));
    } catch { }
  }

  // ── Loading / skeleton ──
  if (userLoading || isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
              <div className="h-10 animate-pulse rounded-lg bg-muted" />
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Expenses & Bills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track one-off expenses and manage recurring bills side by side.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" aria-label="View Categories" asChild>
            <Link href="/dashboard/my-expenses/categories">
              <LayoutGrid className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">View Categories</span>
            </Link>
          </Button>
          {allEntries.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label="Export expenses">
                  <Download className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportBoardToCSV(expenses, billsRaw, categories, paidIds, paidMonth)}>
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBoardToExcel(expenses, billsRaw, categories, paidIds, paidMonth)}>
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Month summary */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold sm:hidden"
            onClick={() => setShowSummaryMobile(!showSummaryMobile)}
          >
            {showSummaryMobile ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Hide summary
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                View summary
              </>
            )}
          </Button>
        </div>

        <div className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 transition-all duration-300",
          !showSummaryMobile && "hidden sm:grid"
        )}>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Expenses - Today</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(totalToday)}</p>
            <p className="text-[11px] text-muted-foreground">{expensesToday.length} item{expensesToday.length !== 1 ? "s" : ""} today</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Expenses - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(totalExpenses)}</p>
            <p className="text-[11px] text-muted-foreground">{expenses.length} item{expenses.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Bills - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(totalBills)}</p>
            <p className="text-[11px] text-muted-foreground">{paidBillsCount} / {billsRaw.length} paid</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Bills Remaining - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-orange-600 dark:text-orange-400">
              {formatCurrency(billsRaw.filter((b) => !paidIds.has(b.id)).reduce((s, b) => s + b.amount, 0))}
            </p>
            <p className="text-[11px] text-muted-foreground">{billsRaw.length - paidBillsCount} unpaid</p>
          </div>
          <div className="col-span-2 rounded-xl border bg-card px-4 py-3 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Total - This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(totalExpenses + totalBills)}</p>
            <p className="text-[11px] text-muted-foreground">Expenses + Bills</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Two-column board */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ════════════ EXPENSES ════════════ */}
        <div className="flex flex-col gap-4">
          {/* Column header */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Expenses</h2>
            <Badge variant="secondary" className="tabular-nums">
              {expenses.length}
            </Badge>
          </div>

          {/* Pie chart */}
          {expenses.length > 0 ? (
            <Card>
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Spending by category
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-3">
                <ExpensePieChart entries={expenses} categories={categories} />
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-52 items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              Add an expense to see the chart
            </div>
          )}

          {/* Quick-add form */}
          <form
            onSubmit={handleAddExpense}
            className="rounded-xl border bg-card px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/30"
          >
            <div className="flex items-center gap-2">
              {/* Left: 2-line on mobile, 1-line on desktop */}
              <div className="min-w-0 flex-1 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-2">
                {/* Row 1 on mobile (name + amount); both unwrap into the parent row on desktop */}
                <div className="flex items-center gap-2 lg:contents">
                  <input
                    ref={expNameRef}
                    value={expName}
                    onChange={(e) => setExpName(e.target.value)}
                    placeholder="Expense name"
                    className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                    disabled={expSaving}
                  />
                  <input
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="₱0"
                    type="number"
                    min="0.01"
                    step="any"
                    className="h-7 w-20 flex-shrink-0 rounded-md border border-input bg-transparent px-2 text-right text-sm placeholder:text-muted-foreground tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    disabled={expSaving}
                  />
                </div>
                {/* Row 2 on mobile (category + date); unwraps on desktop */}
                <div className="flex items-center gap-2 lg:contents">
                  <Select value={expCategory} onValueChange={setExpCategory}>
                    <SelectTrigger className="h-7 min-w-0 flex-1 text-xs">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DatePicker
                    value={expDate}
                    onChange={setExpDate}
                    disabled={expSaving}
                    formatDisplay={formatShortDate}
                    triggerClassName="h-7 w-auto flex-shrink-0 gap-1 px-2 text-xs"
                  />
                </div>
              </div>
              {/* Right: Add button spanning both lines */}
              <button
                type="submit"
                disabled={expSaving || !expName.trim() || !expAmount}
                className="flex-shrink-0 self-stretch rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
              >
                {expSaving ? "…" : "Add"}
              </button>
            </div>
          </form>

          {/* Expenses list */}
          <div className="flex flex-col gap-2">
            {expenses.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No expenses yet — type above and press Enter or click Add.
              </p>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => handleOpenEdit(exp)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/30"
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: getCategoryColor(exp.category_id, categories) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{getEntryName(exp, categories)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {getCategoryLabel(exp.category_id, categories)}
                      {getExpenseDateLabel(exp) && (
                        <span className="text-muted-foreground/60"> · {getExpenseDateLabel(exp)}</span>
                      )}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(exp.amount)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                    className="flex-shrink-0 rounded-full p-1 text-muted-foreground/40 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ════════════ BILLS ════════════ */}
        <div className="flex flex-col gap-4">
          {/* Column header */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Bills</h2>
            <Badge variant="secondary" className="tabular-nums">
              {orderedBills.filter((b) => (b.billing_period ?? "monthly") === billPeriodFilter).length}
            </Badge>
          </div>

          {/* Pie chart */}
          {(() => {
            const filteredBills = orderedBills.filter((b) => (b.billing_period ?? "monthly") === billPeriodFilter);
            return filteredBills.length > 0 ? (
              <Card>
                <CardHeader className="pb-0 pt-4">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Paid vs unpaid ({billPeriodFilter === "monthly" ? "Monthly" : billPeriodFilter === "quarterly" ? "Quarterly" : "Yearly"})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 pb-3">
                  <BillsPieChart bills={filteredBills} paidIds={paidIds} />
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
                Add a {billPeriodFilter} bill to see the chart
              </div>
            );
          })()}

          {/* Period filter tabs + Add Bill */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center rounded-lg bg-muted p-1 gap-0.5">
              {(["monthly", "quarterly", "yearly"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setBillPeriodFilter(period)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-all",
                    billPeriodFilter === period
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period === "monthly" ? "Monthly" : period === "quarterly" ? "Quarterly" : "Yearly"}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowBillForm(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Bill
            </Button>
          </div>

          {/* Draggable bills list */}
          {(() => {
            const filteredBills = orderedBills.filter((b) => (b.billing_period ?? "monthly") === billPeriodFilter);
            if (billsRaw.length === 0) {
              return (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No bills yet — click <strong>Add Bill</strong> above.
                </p>
              );
            }
            if (filteredBills.length === 0) {
              return (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No {billPeriodFilter} bills.
                </p>
              );
            }
            return (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredBills.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {filteredBills.map((bill) => (
                      <SortableBillCard
                        key={bill.id}
                        bill={bill}
                        isPaid={paidIds.has(bill.id)}
                        status={getBillStatus(bill, paidIds.has(bill.id), paidMonth)}
                        onTogglePaid={handleTogglePaid}
                        onDelete={handleDelete}
                        onEdit={handleOpenEdit}
                        categories={categories}
                        paidMonth={paidMonth}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            );
          })()}
        </div>
      </div>

      {/* ── Add Bill modal ── */}
      <Dialog open={showBillForm} onOpenChange={(open) => { if (!open) { setShowBillForm(false); setBillName(""); setBillAmount(""); setBillCategory(""); setBillDue(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {billPeriodFilter === "monthly" ? "Monthly" : billPeriodFilter === "quarterly" ? "Quarterly" : "Yearly"} Bill
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBill} className="grid gap-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="bill-name">Name</Label>
                <Input
                  id="bill-name"
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  placeholder="e.g. Electricity bill"
                  autoFocus
                  disabled={billSaving}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bill-amount">Amount</Label>
                <div className="relative">
                  {/* Currency */}
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {DEFAULT_USER_PREFERENCES.currency || "₱"}
                  </span>

                  <Input
                    id="bill-amount"
                    type="number"
                    min="0.01"
                    step="any"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={billSaving}
                    className="pl-7 pr-3 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="bill-category">Category</Label>
                <Select value={billCategory} onValueChange={setBillCategory}>
                  <SelectTrigger id="bill-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bill-due">Due Date</Label>
                <Input
                  id="bill-due"
                  type="date"
                  value={billDue}
                  onChange={(e) => setBillDue(e.target.value)}
                  disabled={billSaving}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-note">Note</Label>
              <textarea
                id="edit-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note…"
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div className={cn(
              "grid gap-1.5 rounded-lg border p-3",
              capabilities?.hasProLevelAccess
                ? "border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-border opacity-60"
            )}>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Reminder</Label>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Pro / Premium
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map((opt) => {
                  const checked = editReminders.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                        capabilities?.hasProLevelAccess
                          ? checked
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "border-border hover:border-muted-foreground/40"
                          : "pointer-events-none"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        disabled={!capabilities?.hasProLevelAccess}
                        onChange={() => {
                          setEditReminders((prev) =>
                            prev.includes(opt.value)
                              ? prev.filter((d) => d !== opt.value)
                              : [...prev, opt.value]
                          );
                        }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBillForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={billSaving || !billName.trim() || !billAmount || !billDue}
              >
                {billSaving ? "Saving…" : `Add ${billPeriodFilter === "monthly" ? "Monthly" : billPeriodFilter === "quarterly" ? "Quarterly" : "Yearly"} Bill`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit modal ── */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntry?.due_date
                ? `Edit ${editingEntry.billing_period === "quarterly" ? "Quarterly" : editingEntry.billing_period === "yearly" ? "Yearly" : "Monthly"} Bill`
                : "Edit Expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="grid gap-4 py-2">
            {/* Row 1: Name (1/2) + Amount (1/2) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  min="0.01"
                  step="any"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="₱0"
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Row 2: Category (1/2) + Date (1/2) */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-date">{editingEntry?.due_date ? "Due Date" : "Date"}</Label>
                {editingEntry?.due_date
                  ? (
                    <Input
                      id="edit-date"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                  ) : (
                    <DatePicker
                      id="edit-date"
                      value={editExpenseDate}
                      onChange={setEditExpenseDate}
                      formatDisplay={formatShortDate}
                    />
                  )}
              </div>
            </div>

            {/* Note — full width, 3 rows */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-note">Note</Label>
              <textarea
                id="edit-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note…"
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Reminder (bills only) */}
            {editingEntry?.due_date !== null && editingEntry?.due_date !== undefined && (
              <div className={cn(
                "grid gap-1.5 rounded-lg border p-3",
                capabilities?.hasProLevelAccess
                  ? "border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-border opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Reminder</Label>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Pro / Premium
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map((opt) => {
                    const checked = editReminders.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                          capabilities?.hasProLevelAccess
                            ? checked
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "border-border hover:border-muted-foreground/40"
                            : "pointer-events-none"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          disabled={!capabilities?.hasProLevelAccess}
                          onChange={() => {
                            setEditReminders((prev) =>
                              prev.includes(opt.value)
                                ? prev.filter((d) => d !== opt.value)
                                : [...prev, opt.value]
                            );
                          }}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {editError && <p className="text-sm text-destructive">{editError}</p>}

            <DialogFooter>
              <div className="flex w-full items-center gap-2">
                {/* Remove button — left */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 flex-shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Remove"
                  onClick={() => { handleDelete(editingEntry!.id); setEditingEntry(null); }}
                  disabled={editSaving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="flex-1" />
                <Button type="button" variant="outline" onClick={() => setEditingEntry(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSaving || !editName.trim() || !editAmount}
                >
                  {editSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
