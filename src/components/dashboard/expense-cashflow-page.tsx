"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { parseYmToYearMonth } from "@/lib/expense-due-date";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { billsDataQueryOptions } from "@/lib/query/bills";
import { accountsQueryOptions, accountBalancesQueryOptions } from "@/lib/query/accounts";
import {
  EXPENSE_PAYMENT_HISTORY_MONTHS,
  expenseDataQueryOptions,
  monthlyBreakdownQueryOptions,
} from "@/lib/query/expenses";
import { userStreakQueryOptions } from "@/lib/query/streaks";
import { InsightPopup } from "@/components/dashboard/insight-popup";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { getAccountDisplayName } from "@/components/app/account-dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  ArrowUpRight,
  CircleDollarSign,
  Banknote,
  CalendarRange,
  Wallet,
} from "lucide-react";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedAmount } from "@/components/ui/animated-amount";

export type ExpenseCashflowPageVariant = "dashboard";

const GREETINGS = [
  "Hello",
  "Hi",
  "Hey",
  "Welcome back",
  "Good to see you",
  "Howdy",
  "Glad you're here",
];

function RandomGreeting() {
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  return <>{greeting}</>;
}

type DashboardBillStatRow = {
  id: string;
  amount: number;
  billing_period: "monthly" | "quarterly" | "yearly";
  due_month?: number | null;
  created_at?: string;
  end_date?: string | null;
};

function isBillApplicableInMonth(bill: DashboardBillStatRow, paidMonthYm: string): boolean {
  const ym = parseYmToYearMonth(paidMonthYm);
  if (!ym) return false;

  const createdYm = bill.created_at?.slice(0, 7);
  if (createdYm && createdYm > paidMonthYm) return false;

  const endYm = bill.end_date?.slice(0, 7);
  if (endYm && endYm < paidMonthYm) return false;

  if (bill.billing_period === "yearly") {
    return (bill.due_month ?? 1) === ym.month1to12;
  }
  if (bill.billing_period === "quarterly") {
    return [1, 4, 7, 10].includes(ym.month1to12);
  }
  return true;
}

export function ExpenseCashflowPage({
  pageVariant,
}: {
  pageVariant: ExpenseCashflowPageVariant;
}) {
  // pageVariant is kept for backwards compatibility with the dashboard page,
  // but only "dashboard" is supported now. The recurring-expense feature lives
  // in /dashboard/planned-expenses; the per-entry list lives in /dashboard/expenses.
  void pageVariant;

  const { user } = useUser();
  const paidMonthQueryKey = getCurrentPaidMonth();
  const expenseDataQuery = useQuery(expenseDataQueryOptions(paidMonthQueryKey));
  const monthlyBreakdownQuery = useQuery(monthlyBreakdownQueryOptions(EXPENSE_PAYMENT_HISTORY_MONTHS));
  const billsDataQuery = useQuery(billsDataQueryOptions(paidMonthQueryKey));
  const accountsQuery = useQuery(accountsQueryOptions());
  const accountBalancesQuery = useQuery(accountBalancesQueryOptions());
  const streakQuery = useQuery(userStreakQueryOptions());
  const prefsOptional = useUserPreferencesOptional();

  const entries = expenseDataQuery.data?.entries ?? [];
  const paidMonthLabel = expenseDataQuery.data?.paidMonth ?? "";
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

  const dailyAmt = useMemo(
    () =>
      entries
        .filter((e) => e.category_id !== "savings" && e.created_at?.slice(0, 7) === paidMonthYm)
        .reduce((s, e) => s + e.amount, 0),
    [entries, paidMonthYm],
  );

  const billsList = billsDataQuery.data?.bills ?? [];
  const paidBillIds = useMemo(
    () => new Set(billsDataQuery.data?.paidBillIds ?? []),
    [billsDataQuery.data?.paidBillIds],
  );
  const monthBills = useMemo(
    () => billsList.filter((b) => isBillApplicableInMonth(b, paidMonthYm)),
    [billsList, paidMonthYm],
  );
  const billsTotal = useMemo(() => monthBills.reduce((s, b) => s + b.amount, 0), [monthBills]);
  const billsPaid = useMemo(
    () => monthBills.filter((b) => paidBillIds.has(b.id)).reduce((s, b) => s + b.amount, 0),
    [monthBills, paidBillIds],
  );
  const billsPaidCount = useMemo(
    () => monthBills.filter((b) => paidBillIds.has(b.id)).length,
    [monthBills, paidBillIds],
  );
  const totalTrackedBalance = useMemo(() => {
    const accounts = accountsQuery.data ?? [];
    const balances = accountBalancesQuery.data ?? {};
    return accounts
      .filter((a) => a.include_in_net_balance)
      .reduce((s, a) => s + (balances[a.id] ?? 0), 0);
  }, [accountsQuery.data, accountBalancesQuery.data]);

  const billsUnpaid = Math.max(0, billsTotal - billsPaid);
  const billsPaidPct = billsTotal > 0 ? Math.min(100, Math.round((billsPaid / billsTotal) * 100)) : 0;
  const showRing = billsTotal > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* ════════════════════ WELCOME ════════════════════ */}
      {user && (
        <p className="mt-4 mb-2 text-lg font-semibold text-foreground">
          <RandomGreeting />, {getAccountDisplayName(user).split(" ")[0]} 👋
        </p>
      )}

      {/* ════════════════════ HERO: MONTHLY OVERVIEW ════════════════════ */}
      <div className="relative mt-4 mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary/70 p-6 text-primary-foreground shadow-lg dark:from-primary/80 dark:to-primary/50">
        <div className="absolute -right-11 -top-11 h-48 w-48 rounded-full bg-white/10 sm:h-52 sm:w-52" aria-hidden />
        <div className="absolute -bottom-7 -left-7 h-32 w-32 rounded-full bg-white/5 sm:h-36 sm:w-36" aria-hidden />

        <div className="flex items-start">
          <div className={`min-w-0 flex-1 mb-2 ${showRing ? "pr-32 sm:pr-36" : ""}`}>
            <p className="flex items-center gap-2 text-sm font-medium opacity-90">
              <CalendarRange className="h-4 w-4" />
              {paidMonthDisplay}
            </p>
            <p className="mt-2 text-sm opacity-80">Planned expenses still to pay</p>
            <p className="text-4xl font-bold tracking-tight sm:text-5xl">
              <AnimatedAmount value={billsUnpaid} />
            </p>
          </div>
          {showRing && (
            <div className="absolute right-6 top-6 h-28 w-28">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(	#9FE2BF 0% ${billsPaidPct}%, rgba(255,255,255,0.25) ${billsPaidPct}% 100%)`,
                  WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
                  mask: "radial-gradient(circle, transparent 55%, black 56%)",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-[10px] font-medium leading-tight text-primary-foreground">
                <span className="opacity-80">Planned paid</span>
                <span className="text-xl font-bold sm:text-2xl">{billsPaidPct}%</span>
              </div>
            </div>
          )}
        </div>

        {billsTotal > 0 && (
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-xs font-medium opacity-80">
              <span>Planned expenses paid vs total</span>
              <span><AnimatedAmount value={billsPaid} /> / <AnimatedAmount value={billsTotal} /></span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/20">
              <div className="bg-emerald-300 transition-all duration-500" style={{ width: `${billsPaidPct}%` }} />
              <div className="flex-1 bg-white/10" />
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════ STAT CARDS ════════════════════ */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/dashboard/expenses" className="relative rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer">
          <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/50" />
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
            <Banknote className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-lg font-bold"><AnimatedAmount value={dailyAmt} /></p>
          <p className="text-[10px] text-muted-foreground">Spending this month</p>
        </Link>

        <Link href="/dashboard/planned-expenses" className="relative rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer">
          <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/50" />
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Planned paid</p>
          <p className="text-lg font-bold"><AnimatedAmount value={billsPaid} /></p>
          <p className="text-[10px] text-muted-foreground">
            {billsPaidCount}/{monthBills.length} planned expenses paid this month
          </p>
        </Link>

        <Link href="/dashboard" className="relative rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Planned Paid + Expenses</p>
          <p className="text-lg font-bold"><AnimatedAmount value={billsPaid + dailyAmt} /></p>
          <p className="text-[10px] text-muted-foreground">Combined total this month</p>
        </Link>

        <Link href="/dashboard/accounts" className="relative rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer">
          <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/50" />
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
            <Wallet className="h-4 w-4" />
          </div>
          <p className="text-xs text-muted-foreground">Account Balance</p>
          <p className="text-lg font-bold"><AnimatedAmount value={totalTrackedBalance} /></p>
          <p className="text-[10px] text-muted-foreground">
            Total tracked net balance
          </p>
        </Link>
      </div>

      {/* ════════════════════ MONTHLY BREAKDOWN BAR CHART ════════════════════ */}
      {(() => {
        const breakdown = monthlyBreakdownQuery.data ?? [];
        if (monthlyBreakdownQuery.isPending) {
          return (
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Planned Expenses vs Planned Paid vs Expenses vs Savings</CardTitle>
                <CardDescription>Last 6 months breakdown by type</CardDescription>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          );
        }
        if (!breakdown.length) return null;
        const hasData = breakdown.some(
          (r) => r.bills > 0 || r.billsPaid > 0 || r.expenses > 0 || r.savings > 0
        );
        if (!hasData) return null;
        const chartData = breakdown.map((r) => ({
          month: new Date(`${r.month}-01`).toLocaleDateString("en-PH", { month: "short" }),
          Planned: r.bills,
          "Planned Paid": r.billsPaid ?? 0,
          Expenses: r.expenses,
          Savings: r.savings,
        }));
        const BILL_COLOR = "hsl(199 89% 48%)";
        const BILL_PAID_COLOR = "hsl(221 83% 53%)";
        const EXP_COLOR = "hsl(38 92% 50%)";
        const SAV_COLOR = "hsl(142 71% 45%)";
        const fmtY = (v: number) => v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`;
        return (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Planned Expenses vs Planned Paid vs Expenses vs Savings</CardTitle>
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
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="Planned" fill={BILL_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Planned Paid" fill={BILL_PAID_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Expenses" fill={EXP_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Savings" fill={SAV_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* ════════════════════ CTA: EXPENSES & PLANNED EXPENSES ════════════════════ */}
      <Card className="mb-6 border-primary/25 bg-muted/20">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">Expenses & Planned Expenses</p>
            <p className="text-sm text-muted-foreground">
              Track daily spending in Expenses, manage recurring planned expenses in Planned Expenses.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/expenses">Expenses</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/planned-expenses">Planned Expenses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ════════════════════ INSIGHT POPUP ════════════════════ */}
      {/* Only mount once every query the popup reads from has settled — */}
      {/* prevents the content from flipping as queries land one by one. */}
      {user && streakQuery.isSuccess && billsDataQuery.isSuccess && (
        <InsightPopup
          firstName={getAccountDisplayName(user).split(" ")[0]}
          streak={streakQuery.data?.streak_count ?? 1}
          billsPaidPct={billsTotal > 0 ? billsPaidPct : undefined}
        />
      )}
    </div>
  );
}
