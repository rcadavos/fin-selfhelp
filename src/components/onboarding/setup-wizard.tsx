"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Bell, Check, CheckCircle2, ChevronRight, Loader2, SkipForward, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { accountsQueryOptions, invalidateAccountQueries } from "@/lib/query/accounts";
import { invalidateVehicleQueriesIfTransportAffected } from "@/lib/query/vehicles";
import { useUser } from "@/hooks/use-user";
import { completeOnboarding } from "@/actions/onboarding";
import { addExpense } from "@/actions/budget";
import { createAccountExpense } from "@/actions/account-transactions";
import { createAccount } from "@/actions/accounts";
import type { AccountType } from "@/actions/accounts";
import { BANK_GROUPS, getBankColor, getBankLogoSlug } from "@/lib/constants/account-institutions";
import { ACCOUNT_TYPE_OPTIONS, CURRENCIES } from "@/components/dashboard/account-form-dialog";
import { APP_MODE_OPTIONS, type AppModeId } from "@/lib/constants/app-mode";
import { useAppMode } from "@/hooks/use-app-mode";
import { cn } from "@/lib/utils";

type Step = "mode" | "profile" | "account" | "expense" | "done";

const FULL_STEPS: readonly Step[] = ["mode", "profile", "account", "expense", "done"];
/** Bills mode hides accounts and expenses, so setting them up here would create data the user can't see. */
const BILLS_STEPS: readonly Step[] = ["mode", "profile", "done"];

const STEP_LABELS: Record<Step, string> = {
  mode: "Mode",
  profile: "Profile",
  account: "Account",
  expense: "Expense",
  done: "Done",
};

const MODE_ICONS: Record<AppModeId, typeof TrendingUp> = {
  full: TrendingUp,
  bills: Bell,
};

const FIX_OPTIONS = [
  { id: "overspending", label: "Overspending every month" },
  { id: "missing_bills", label: "Missing bill payments" },
  { id: "no_savings", label: "Not saving enough" },
  { id: "losing_track", label: "Losing track of finances" },
];

const GOAL_OPTIONS = [
  { id: "travel_savings", label: "Travel savings goal" },
  { id: "emergency_fund", label: "Build an emergency fund" },
  { id: "house_renovation", label: "House renovation fund" },
  { id: "mp2_savings", label: "Build an MP2 savings" },
  { id: "solar_panel", label: "Saving for solar panel installation" },
  { id: "vehicle_maintenance", label: "Vehicle maintenance savings" },
];

interface Props {
  initialName: string;
  userId: string;
}

export function SetupWizard({ initialName }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshUser } = useUser();
  const { mode, isBillsMode, setMode } = useAppMode();
  const [step, setStep] = useState<Step>("mode");
  const [isPending, startTransition] = useTransition();

  // Step 1 — profile
  const [name, setName] = useState(initialName);
  const [fixes, setFixes] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  // Step 2 — account
  const [bankName, setBankName] = useState("");
  const [accountAlias, setAccountAlias] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("debit");
  const [currency, setCurrency] = useState("PHP");
  const [startingBalance, setStartingBalance] = useState("");
  const [maintainingBalance, setMaintainingBalance] = useState("");
  const [accountError, setAccountError] = useState("");

  // Step 3 — expense
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [expenseError, setExpenseError] = useState("");

  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const { data: accounts = [] } = useQuery(accountsQueryOptions());

  const steps = useMemo(() => (isBillsMode ? BILLS_STEPS : FULL_STEPS), [isBillsMode]);
  const stepIndex = steps.indexOf(step);

  function toggleItem(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function finishAndRedirect() {
    router.push("/dashboard");
  }

  function handleProfileNext() {
    startTransition(async () => {
      // Bills mode hides Goals, so never create goal rows the user has no page for.
      await completeOnboarding({ fullName: name, goals: isBillsMode ? [] : goals, fixes });
      await refreshUser();
      setStep(isBillsMode ? "done" : "account");
    });
  }

  function handleProfileSkip() {
    startTransition(async () => {
      await completeOnboarding({});
      await refreshUser();
      setStep(isBillsMode ? "done" : "account");
    });
  }

  function handleAccountNext() {
    setAccountError("");
    startTransition(async () => {
      if (bankName) {
        const color = getBankColor(bankName) ?? "#6366f1";
        const balance = parseFloat(startingBalance);
        const maintaining = parseFloat(maintainingBalance);
        const res = await createAccount({
          account_alias: accountAlias.trim() || bankName,
          bank_name: bankName,
          tags: [],
          color,
          account_type: accountType,
          starting_balance: isNaN(balance) || balance < 0 ? 0 : balance,
          interest_frequency: null,
          interest_rate: null,
          maintaining_balance: maintainingBalance.trim() && !isNaN(maintaining) ? maintaining : null,
          credit_limit: null,
          include_in_net_balance: true,
          currency: currency || "PHP",
        });
        if (res.error) { setAccountError(res.error); return; }
        invalidateAccountQueries(queryClient);
      }
      setStep("expense");
    });
  }

  function handleExpenseNext() {
    setExpenseError("");
    const amount = parseFloat(expenseAmount);
    if (!expenseNote.trim()) { setExpenseError("Enter a name for this expense."); return; }
    if (!expenseCategoryId) { setExpenseError("Please select a category."); return; }
    if (!amount || amount <= 0) { setExpenseError("Enter a valid amount."); return; }
    if (!expenseAccountId) { setExpenseError("Please select an account."); return; }
    startTransition(async () => {
      const res = await addExpense(
        expenseCategoryId,
        amount,
        expenseNote || null,
        null,
        undefined,
        expenseAccountId,
      );
      if (res.error) { setExpenseError(res.error); return; }
      const selectedAccount = accounts.find((a) => a.id === expenseAccountId);
      const isCash = selectedAccount?.account_alias.toLowerCase() === "cash";
      if (!isCash) {
        await createAccountExpense({ accountId: expenseAccountId, amount, description: expenseNote });
      }
      invalidateAccountQueries(queryClient);
      invalidateVehicleQueriesIfTransportAffected(queryClient, expenseCategoryId);
      setStep("done");
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start px-4 py-10 sm:py-16">
      {/* Step progress */}
      {step !== "done" && (
        <div className="mb-8 flex items-start">
          {steps.filter((s) => s !== "done").map((s, i) => (
            <div key={s} className="flex items-start">
              {i > 0 && (
                <div className="flex h-8 items-center">
                  <div className={cn("h-px w-10 transition-colors sm:w-14", i <= stepIndex ? "bg-primary" : "bg-border")} />
                </div>
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                  i < stepIndex
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === stepIndex
                      ? "border-primary bg-background text-primary ring-2 ring-primary/20"
                      : "border-border bg-background text-muted-foreground/40",
                )}>
                  {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn(
                  "text-[11px] font-medium",
                  i < stepIndex ? "text-primary" : i === stepIndex ? "text-foreground" : "text-muted-foreground/40",
                )}>
                  {STEP_LABELS[s]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-md">
        {step === "mode" && (
          <ModeStep
            mode={mode}
            onSelectMode={setMode}
            onNext={() => setStep("profile")}
            isPending={isPending}
          />
        )}

        {step === "profile" && (
          <ProfileStep
            name={name}
            setName={setName}
            fixes={fixes}
            goals={goals}
            showGoals={!isBillsMode}
            onToggleFix={(id) => toggleItem(fixes, setFixes, id)}
            onToggleGoal={(id) => toggleItem(goals, setGoals, id)}
            onNext={handleProfileNext}
            onSkip={handleProfileSkip}
            isPending={isPending}
          />
        )}

        {step === "account" && (
          <AccountStep
            bankName={bankName}
            setBankName={setBankName}
            accountAlias={accountAlias}
            setAccountAlias={setAccountAlias}
            accountType={accountType}
            setAccountType={setAccountType}
            currency={currency}
            setCurrency={setCurrency}
            startingBalance={startingBalance}
            setStartingBalance={setStartingBalance}
            maintainingBalance={maintainingBalance}
            setMaintainingBalance={setMaintainingBalance}
            error={accountError}
            onNext={handleAccountNext}
            onSkip={() => setStep("expense")}
            isPending={isPending}
          />
        )}

        {step === "expense" && (
          <ExpenseStep
            categories={categories}
            accounts={accounts}
            categoryId={expenseCategoryId}
            setCategoryId={setExpenseCategoryId}
            amount={expenseAmount}
            setAmount={setExpenseAmount}
            note={expenseNote}
            setNote={setExpenseNote}
            accountId={expenseAccountId}
            setAccountId={setExpenseAccountId}
            error={expenseError}
            onNext={handleExpenseNext}
            onSkip={() => setStep("done")}
            isPending={isPending}
          />
        )}

        {step === "done" && <DoneStep name={name} isBillsMode={isBillsMode} onFinish={finishAndRedirect} />}
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

interface ModeStepProps {
  mode: AppModeId;
  onSelectMode: (next: AppModeId) => void;
  onNext: () => void;
  isPending: boolean;
}

function ModeStep({ mode, onSelectMode, onNext, isPending }: ModeStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          How do you want to use OmniTrak?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You can change this any time in Settings.
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {APP_MODE_OPTIONS.map((option) => {
            const selected = option.value === mode;
            const Icon = MODE_ICONS[option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectMode(option.value)}
                aria-pressed={selected}
                className={cn(
                  "relative flex flex-col gap-2 surface border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {selected && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground/60")} />
                <div className="pr-7">
                  <p className={cn("text-sm font-semibold", selected && "text-primary")}>{option.label}</p>
                  <p className="text-xs font-medium text-muted-foreground">{option.tagline}</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                <ul className="space-y-1">
                  {option.includes.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <CheckCircle2
                        className={cn("h-3 w-3 shrink-0", selected ? "text-primary" : "text-muted-foreground/30")}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Nothing is deleted when you switch — hidden pages just come back.
        </p>
      </div>

      <StepFooter
        onNext={onNext}
        nextLabel="Continue"
        isPending={isPending}
      />
    </div>
  );
}

interface ProfileStepProps {
  name: string;
  setName: (v: string) => void;
  fixes: string[];
  goals: string[];
  showGoals: boolean;
  onToggleFix: (id: string) => void;
  onToggleGoal: (id: string) => void;
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}

function ProfileStep({ name, setName, fixes, goals, showGoals, onToggleFix, onToggleGoal, onNext, onSkip, isPending }: ProfileStepProps) {
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

      {showGoals && (
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
      )}

      <StepFooter
        onNext={onNext}
        onSkip={onSkip}
        nextLabel="Next"
        isPending={isPending}
      />
    </div>
  );
}

interface AccountStepProps {
  bankName: string;
  setBankName: (v: string) => void;
  accountAlias: string;
  setAccountAlias: (v: string) => void;
  accountType: AccountType;
  setAccountType: (v: AccountType) => void;
  currency: string;
  setCurrency: (v: string) => void;
  startingBalance: string;
  setStartingBalance: (v: string) => void;
  maintainingBalance: string;
  setMaintainingBalance: (v: string) => void;
  error: string;
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}

function AccountStep({ bankName, setBankName, accountAlias, setAccountAlias, accountType, setAccountType, currency, setCurrency, startingBalance, setStartingBalance, maintainingBalance, setMaintainingBalance, error, onNext, onSkip, isPending }: AccountStepProps) {
  const [bankSearch, setBankSearch] = useState("");

  const filteredGroups = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) return BANK_GROUPS;
    return BANK_GROUPS
      .map((g) => ({ ...g, banks: g.banks.filter((b) => b.toLowerCase().includes(query)) }))
      .filter((g) => g.banks.length > 0);
  }, [bankSearch]);

  const showOther = !bankSearch.trim() || "other".includes(bankSearch.trim().toLowerCase());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add your first account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a bank or e-wallet account for tracking. A Cash account is already set up for you.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          This is for tracking purposes only — not linked to your real bank account.
        </p>
      </div>

      <div className="space-y-4">
        {/* Row 1: Account name | Type */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="acc-alias">Account Name</Label>
            <Input
              id="acc-alias"
              placeholder="e.g. Savings, Payroll"
              value={accountAlias}
              onChange={(e) => setAccountAlias(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-type">Type</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
              <SelectTrigger id="acc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Bank / e-Wallet / Platform | Currency */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="acc-bank">Bank / e-Wallet / Platform</Label>
            <Select
              value={bankName}
              onValueChange={(v) => { setBankName(v); setBankSearch(""); }}
            >
              <SelectTrigger id="acc-bank">
                <SelectValue placeholder="Select bank or e-wallet">
                  {bankName ? (
                    <span className="flex items-center gap-2 min-w-0">
                      {bankName !== "Other" && getBankLogoSlug(bankName) && (
                        <Image src={`/images/bank-logo/${getBankLogoSlug(bankName)}.webp`} alt="" width={16} height={16} className="flex-shrink-0 object-contain" unoptimized />
                      )}
                      <span className="truncate">{bankName}</span>
                    </span>
                  ) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <div className="sticky top-0 z-10 bg-popover px-2 pb-2 pt-1">
                  <Input
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Search..."
                    className="h-8 text-xs"
                  />
                </div>
                {filteredGroups.length === 0 && !showOther ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">No results found.</p>
                ) : (
                  <>
                    {filteredGroups.map((group, gi) => (
                      <SelectGroup key={group.label}>
                        {gi > 0 && <SelectSeparator />}
                        <SelectLabel className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <span className="h-px flex-1 bg-border" />
                          {group.label}
                          <span className="h-px flex-1 bg-border" />
                        </SelectLabel>
                        {group.banks.map((b) => (
                          <SelectItem key={b} value={b}>
                            <span className="flex items-center gap-2">
                              {getBankLogoSlug(b) && (
                                <Image src={`/images/bank-logo/${getBankLogoSlug(b)}.webp`} alt="" width={16} height={16} className="flex-shrink-0 object-contain" unoptimized />
                              )}
                              {b}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                    {showOther && (
                      <SelectGroup>
                        <SelectSeparator />
                        <SelectLabel className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <span className="h-px flex-1 bg-border" />
                          Other
                          <span className="h-px flex-1 bg-border" />
                        </SelectLabel>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectGroup>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="acc-currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Starting Balance | Minimum Balance */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="acc-starting-balance">Starting Balance</Label>
            <AmountInput
              id="acc-starting-balance"
              placeholder="0.00"
              value={startingBalance}
              onChange={setStartingBalance}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-maintaining-balance">
              Minimum Balance <span className="text-muted-foreground">(optional)</span>
            </Label>
            <AmountInput
              id="acc-maintaining-balance"
              placeholder="0.00"
              value={maintainingBalance}
              onChange={setMaintainingBalance}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
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
interface AccountItem { id: string; account_alias: string; bank_name: string; color: string; }

interface ExpenseStepProps {
  categories: CategoryItem[];
  accounts: AccountItem[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  accountId: string;
  setAccountId: (v: string) => void;
  error: string;
  onNext: () => void;
  onSkip: () => void;
  isPending: boolean;
}

function ExpenseStep({ categories, accounts, categoryId, setCategoryId, amount, setAmount, note, setNote, accountId, setAccountId, error, onNext, onSkip, isPending }: ExpenseStepProps) {
  const sortedAccounts = [...accounts].sort((a, b) =>
    a.account_alias.toLowerCase() === "cash" ? -1 : b.account_alias.toLowerCase() === "cash" ? 1 : 0
  );
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;
  const selectedLogoSlug = selectedAccount ? getBankLogoSlug(selectedAccount.bank_name) : null;

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
          <AmountInput
            id="expense-amount"
            placeholder="0.00"
            value={amount}
            onChange={setAmount}
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

        {accounts.length > 0 && (
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-auto min-h-10 py-2">
                {selectedAccount ? (
                  <div className="flex min-w-0 items-center gap-2">
                    {selectedLogoSlug ? (
                      <Image src={`/images/bank-logo/${selectedLogoSlug}.webp`} alt={selectedAccount.bank_name} width={18} height={18} className="flex-shrink-0 rounded object-contain" unoptimized />
                    ) : (
                      <span className="h-[18px] w-[18px] flex-shrink-0 rounded-md" style={{ backgroundColor: selectedAccount.color }} />
                    )}
                    <span className="truncate text-sm font-medium">{selectedAccount.account_alias}</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select account" />
                )}
              </SelectTrigger>
              <SelectContent>
                {sortedAccounts.map((acc) => {
                  const logoSlug = getBankLogoSlug(acc.bank_name);
                  return (
                    <SelectItem key={acc.id} value={acc.id} className="py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {logoSlug ? (
                          <Image src={`/images/bank-logo/${logoSlug}.webp`} alt={acc.bank_name} width={18} height={18} className="flex-shrink-0 rounded object-contain" unoptimized />
                        ) : (
                          <span className="h-[18px] w-[18px] flex-shrink-0 rounded-md" style={{ backgroundColor: acc.color }} />
                        )}
                        <span className="truncate text-sm">{acc.account_alias}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

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

function DoneStep({ name, isBillsMode, onFinish }: { name: string; isBillsMode: boolean; onFinish: () => void }) {
  const firstName = name.trim().split(" ")[0];
  const greeting = firstName ? `You've got this, ${firstName}!` : "You've got this!";
  const HeroIcon = isBillsMode ? Bell : TrendingUp;

  return (
    <div className="flex flex-col items-center gap-8 text-center py-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
        <HeroIcon className="h-12 w-12 text-primary" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting} 🎉</h2>
        <p className="text-base font-medium text-foreground">
          {isBillsMode ? "No more missed due dates." : "Your financial journey starts today."}
        </p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {isBillsMode
            ? "Add what's coming up and OmniTrak keeps every due date in front of you. One bill at a time is all it takes to stay ahead."
            : "Every expense tracked, every account balanced, every goal set — it all adds up. Small consistent actions are what build real financial freedom over time."}
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border bg-muted/40 px-5 py-4 text-left space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s next</p>
        {isBillsMode ? (
          <ul className="space-y-1.5 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Add your first bill — rent, utilities, or a subscription.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Set a due date so it shows up on your dashboard before it&apos;s late.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Use Reminders for the to-dos and to-buys you keep forgetting.
            </li>
          </ul>
        ) : (
          <ul className="space-y-1.5 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Check your dashboard — your expenses are already tracked.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Add more accounts on the Accounts page to track all your balances.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Visit your Goals page to track your savings progress over time.
            </li>
          </ul>
        )}
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
        "flex items-center gap-2 surface border px-3 py-2.5 text-left text-sm transition-colors",
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
  /** Omit on steps that always have a valid answer, so no Skip action is rendered. */
  onSkip?: () => void;
  nextLabel: string;
  isPending: boolean;
  skipLabel?: string;
}

function StepFooter({ onNext, onSkip, nextLabel, isPending, skipLabel = "Skip for now" }: StepFooterProps) {
  return (
    <div className={cn(
      "flex flex-col gap-2 pt-2 sm:flex-row sm:items-center",
      onSkip ? "sm:justify-between" : "sm:justify-end",
    )}>
      {onSkip && (
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
      )}
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
