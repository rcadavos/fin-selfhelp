"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Loader2, SkipForward, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { completeOnboarding } from "@/actions/onboarding";
import { addExpense } from "@/actions/budget";
import { addBill } from "@/actions/bills";
import { cn } from "@/lib/utils";

const STEPS = ["profile", "expense", "bill", "done"] as const;
type Step = (typeof STEPS)[number];

const FIX_OPTIONS = [
  { id: "overspending", label: "Overspending every month" },
  { id: "missing_bills", label: "Missing bill payments" },
  { id: "no_savings", label: "Not saving enough" },
  { id: "losing_track", label: "Losing track of finances" },
];

const GOAL_OPTIONS = [
  { id: "save_money", label: "Save more money" },
  { id: "emergency_fund", label: "Build an emergency fund" },
  { id: "pay_debt", label: "Pay off debt" },
  { id: "budget", label: "Stick to a budget" },
  { id: "plan_future", label: "Plan for the future" },
  { id: "track_expenses", label: "Track all my expenses" },
];

interface Props {
  initialName: string;
  userId: string;
}

export function SetupWizard({ initialName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [isPending, startTransition] = useTransition();

  // Step 1 — profile
  const [name, setName] = useState(initialName);
  const [fixes, setFixes] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  // Step 2 — expense
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseError, setExpenseError] = useState("");

  // Step 3 — bill
  const [billCategoryId, setBillCategoryId] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billNote, setBillNote] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billError, setBillError] = useState("");

  const { data: categories = [] } = useQuery(categoriesQueryOptions());

  const stepIndex = STEPS.indexOf(step);

  function toggleItem(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function finishAndRedirect() {
    router.push("/dashboard");
  }

  function handleProfileNext() {
    startTransition(async () => {
      await completeOnboarding({ fullName: name, goals, fixes });
      setStep("expense");
    });
  }

  function handleProfileSkip() {
    startTransition(async () => {
      await completeOnboarding({});
      setStep("expense");
    });
  }

  function handleExpenseNext() {
    setExpenseError("");
    const amount = parseFloat(expenseAmount);
    if (!expenseNote.trim()) { setExpenseError("Enter a name for this expense."); return; }
    if (!expenseCategoryId) { setExpenseError("Please select a category."); return; }
    if (!amount || amount <= 0) { setExpenseError("Enter a valid amount."); return; }
    startTransition(async () => {
      const res = await addExpense(expenseCategoryId, amount, expenseNote || null);
      if (res.error) { setExpenseError(res.error); return; }
      setStep("bill");
    });
  }

  function handleBillNext() {
    setBillError("");
    const amount = parseFloat(billAmount);
    if (!billNote.trim()) { setBillError("Enter a bill name."); return; }
    if (!billCategoryId) { setBillError("Please select a category."); return; }
    if (!amount || amount <= 0) { setBillError("Enter a valid amount."); return; }
    if (!billDueDate) { setBillError("Select a due date."); return; }
    startTransition(async () => {
      const res = await addBill(billCategoryId, amount, billNote, billDueDate);
      if (res.error) { setBillError(res.error); return; }
      setStep("done");
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start px-4 py-10 sm:py-16">
      {/* Progress dots */}
      {step !== "done" && (
        <div className="mb-8 flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i < stepIndex
                  ? "w-6 bg-primary"
                  : i === stepIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-md">
        {step === "profile" && (
          <ProfileStep
            name={name}
            setName={setName}
            fixes={fixes}
            goals={goals}
            onToggleFix={(id) => toggleItem(fixes, setFixes, id)}
            onToggleGoal={(id) => toggleItem(goals, setGoals, id)}
            onNext={handleProfileNext}
            onSkip={handleProfileSkip}
            isPending={isPending}
          />
        )}

        {step === "expense" && (
          <ExpenseStep
            categories={categories}
            categoryId={expenseCategoryId}
            setCategoryId={setExpenseCategoryId}
            amount={expenseAmount}
            setAmount={setExpenseAmount}
            note={expenseNote}
            setNote={setExpenseNote}
            error={expenseError}
            onNext={handleExpenseNext}
            onSkip={() => setStep("bill")}
            isPending={isPending}
          />
        )}

        {step === "bill" && (
          <BillStep
            categories={categories}
            categoryId={billCategoryId}
            setCategoryId={setBillCategoryId}
            amount={billAmount}
            setAmount={setBillAmount}
            note={billNote}
            setNote={setBillNote}
            dueDate={billDueDate}
            setDueDate={(v) => setBillDueDate(v ?? "")}
            error={billError}
            onNext={handleBillNext}
            onSkip={() => setStep("done")}
            isPending={isPending}
          />
        )}

        {step === "done" && <DoneStep name={name} onFinish={finishAndRedirect} />}
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

interface ProfileStepProps {
  name: string;
  setName: (v: string) => void;
  fixes: string[];
  goals: string[];
  onToggleFix: (id: string) => void;
  onToggleGoal: (id: string) => void;
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}

function ProfileStep({ name, setName, fixes, goals, onToggleFix, onToggleGoal, onNext, onSkip, isPending }: ProfileStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome to OmniTrak 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let&apos;s personalize your experience. This only takes a minute.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-name">Your name</Label>
        <Input
          id="onboarding-name"
          placeholder="e.g. Alex"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">What do you want to fix?</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FIX_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt.id}
              label={opt.label}
              selected={fixes.includes(opt.id)}
              onToggle={() => onToggleFix(opt.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">What are your goals?</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GOAL_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt.id}
              label={opt.label}
              selected={goals.includes(opt.id)}
              onToggle={() => onToggleGoal(opt.id)}
            />
          ))}
        </div>
      </div>

      <StepFooter
        onNext={onNext}
        onSkip={onSkip}
        nextLabel="Next"
        isPending={isPending}
      />
    </div>
  );
}

interface CategoryItem { id: string; label: string; }

interface ExpenseStepProps {
  categories: CategoryItem[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  error: string;
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}

function ExpenseStep({ categories, categoryId, setCategoryId, amount, setAmount, note, setNote, error, onNext, onSkip, isPending }: ExpenseStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add your first expense</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track a recurring expense — like rent, groceries, or subscriptions.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="expense-note">Name</Label>
          <Input
            id="expense-note"
            placeholder="e.g. Groceries, Lunch, Bus fare"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount</Label>
          <Input
            id="expense-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <StepFooter
        onNext={onNext}
        onSkip={onSkip}
        nextLabel="Save & Next"
        isPending={isPending}
      />
    </div>
  );
}

interface BillStepProps {
  categories: CategoryItem[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string | undefined) => void;
  error: string;
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}

function BillStep({ categories, categoryId, setCategoryId, amount, setAmount, note, setNote, dueDate, setDueDate, error, onNext, onSkip, isPending }: BillStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add your first bill</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a bill to track — like electricity, internet, or a loan payment.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bill-name">Bill name</Label>
          <Input
            id="bill-name"
            placeholder="e.g. Electric bill"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bill-amount">Amount</Label>
          <Input
            id="bill-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Due date</Label>
          <DatePicker
            value={dueDate}
            onChange={(ymd) => setDueDate(ymd)}
            placeholder="Pick a due date"
            showOutsideDays={false}
            disableNavigation
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <StepFooter
        onNext={onNext}
        onSkip={onSkip}
        nextLabel="Save & Finish"
        isPending={isPending}
        skipLabel="Skip & Finish"
      />
    </div>
  );
}

function DoneStep({ name, onFinish }: { name: string; onFinish: () => void }) {
  const firstName = name.trim().split(" ")[0];
  const greeting = firstName ? `You've got this, ${firstName}!` : "You've got this!";

  return (
    <div className="flex flex-col items-center gap-8 text-center py-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
        <TrendingUp className="h-12 w-12 text-primary" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting} 🎉</h2>
        <p className="text-base font-medium text-foreground">
          Your financial journey starts today.
        </p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Every expense tracked, every bill remembered, every goal set — it all adds up.
          Small consistent actions are what build real financial freedom over time.
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-muted/40 px-5 py-4 text-left space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s next</p>
        <ul className="space-y-1.5 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Check your dashboard — your expenses and bills are already there.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Mark bills as paid when you settle them each month.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Visit your Goals page to track your progress over time.
          </li>
        </ul>
      </div>

      <Button size="lg" className="w-full max-w-sm" onClick={onFinish}>
        Start Tracking
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ToggleChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      <CheckCircle2
        className={cn("h-4 w-4 shrink-0", selected ? "text-primary" : "text-muted-foreground/30")}
      />
      {label}
    </button>
  );
}

interface StepFooterProps {
  onNext: () => void;
  onSkip: () => void;
  nextLabel: string;
  isPending: boolean;
  skipLabel?: string;
}

function StepFooter({ onNext, onSkip, nextLabel, isPending, skipLabel = "Skip for now" }: StepFooterProps) {
  return (
    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={onSkip}
        disabled={isPending}
      >
        <SkipForward className="mr-1.5 h-3.5 w-3.5" />
        {skipLabel}
      </Button>
      <Button
        type="button"
        onClick={onNext}
        disabled={isPending}
        className="sm:min-w-36"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ChevronRight className="mr-1 h-4 w-4" />
        )}
        {nextLabel}
      </Button>
    </div>
  );
}
