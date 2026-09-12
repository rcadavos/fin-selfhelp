"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useAppMode } from "@/hooks/use-app-mode";
import { parseYmToYearMonth, effectiveDueDateInPaidMonth } from "@/lib/expense-due-date";
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
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { getAccountDisplayName } from "@/components/app/account-dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUp, Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { Skeleton } from "@/components/ui/skeleton";
import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import { DotLeader } from "@/components/passbook/dot-leader";

export type ExpenseCashflowPageVariant = "dashboard";

const MASK = "••••••";

/** Horizon of the bills-mode "Due in 7 days" cell. */
const DUE_SOON_DAYS = 7;

const GREETINGS = [
  "Hello",
  "Hi",
  "Hey",
  "Welcome back",
  "Good to see you",
  "Howdy",
  "Glad you're here",
];

// Stable across SSR + first client render (no Math.random in a useState initializer,
// which could desync server/client and trip a hydration mismatch). The varied
// greeting is chosen after mount, when only the client is rendering.
function GreetingText() {
  const [greeting, setGreeting] = useState("Good to see you");
  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }, []);
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

// The mono/uppercase label used on every stat cell and section eyebrow.
const CELL_LABEL = "flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground";

// Internal hairline rules for the responsive 4/2-up stat grid.
const CELL_BORDERS = [
  "",
  "border-l border-border",
  "border-t border-border sm:border-t-0 sm:border-l",
  "border-l border-t border-border sm:border-t-0",
];

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
  // Bills mode drops the accounts, expenses and spending-chart sections, so the four
  // queries feeding them are conditional — nothing left on the page reads their data.
  const { isBillsMode, isFeatureEnabled } = useAppMode();
  const paidMonthQueryKey = getCurrentPaidMonth();
  const expenseDataQuery = useQuery({
    ...expenseDataQueryOptions(paidMonthQueryKey),
    enabled: !isBillsMode,
  });
  const monthlyBreakdownQuery = useQuery({
    ...monthlyBreakdownQueryOptions(EXPENSE_PAYMENT_HISTORY_MONTHS),
    enabled: !isBillsMode,
  });
  const billsDataQuery = useQuery(billsDataQueryOptions(paidMonthQueryKey));
  const accountsQuery = useQuery({ ...accountsQueryOptions(), enabled: !isBillsMode });
  const accountBalancesQuery = useQuery({
    ...accountBalancesQueryOptions(),
    enabled: !isBillsMode,
  });
  const streakQuery = useQuery(userStreakQueryOptions());
  const prefsOptional = useUserPreferencesOptional();

  const locale =
    (prefsOptional?.preferences?.language ?? DEFAULT_USER_PREFERENCES.language) === "fil"
      ? "fil-PH"
      : "en-PH";

  const entries = expenseDataQuery.data?.entries ?? [];
  // Falls back to the current paid month so the month heading still renders in bills
  // mode, where the expense query never runs.
  const paidMonthLabel = expenseDataQuery.data?.paidMonth ?? paidMonthQueryKey;
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
    return monthDate.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }, [paidMonthYm, locale]);

  const dailyAmt = useMemo(
    () =>
      entries
        .filter((e) => e.category_id !== "savings" && e.created_at?.slice(0, 7) === paidMonthYm)
        .reduce((s, e) => s + e.amount, 0),
    [entries, paidMonthYm],
  );

  const billsList = billsDataQuery.data?.bills ?? [];
  const paymentAmountByBillId = billsDataQuery.data?.paymentAmountByBillId ?? {};
  const monthBills = useMemo(
    () =>
      billsList.filter(
        (b) => b.category_id !== "savings" && isBillApplicableInMonth(b, paidMonthYm),
      ),
    [billsList, paidMonthYm],
  );
  const billsTotal = useMemo(() => monthBills.reduce((s, b) => s + b.amount, 0), [monthBills]);
  // Only sum payments for bills that are actually due this month so billsPaid
  // and billsTotal always cover the same set (prevents billsPaid > billsTotal).
  const monthBillIds = useMemo(
    () => new Set(monthBills.map((b) => b.id)),
    [monthBills],
  );
  const billsPaid = useMemo(
    () =>
      Object.entries(paymentAmountByBillId)
        .filter(([id]) => monthBillIds.has(id))
        .reduce((s, [, v]) => s + Number(v ?? 0), 0),
    [paymentAmountByBillId, monthBillIds],
  );
  // Count bills due this month that have any payment row (full or partial).
  const billsPaidCount = useMemo(
    () =>
      Object.entries(paymentAmountByBillId).filter(
        ([id, v]) => monthBillIds.has(id) && Number(v ?? 0) > 0,
      ).length,
    [paymentAmountByBillId, monthBillIds],
  );
  const totalTrackedBalance = useMemo(() => {
    const accounts = accountsQuery.data ?? [];
    const balances = accountBalancesQuery.data ?? {};
    return accounts
      .filter((a) => a.include_in_net_balance)
      .reduce((s, a) => s + (balances[a.id] ?? 0), 0);
  }, [accountsQuery.data, accountBalancesQuery.data]);
  const includedAccountCount = useMemo(
    () => (accountsQuery.data ?? []).filter((a) => a.include_in_net_balance).length,
    [accountsQuery.data],
  );

  // Savings deposited this month — a real, positive movement in tracked holdings.
  // Sourced from the same 6-month breakdown that powers the chart (no extra call).
  const savedThisMonth = useMemo(
    () => (monthlyBreakdownQuery.data ?? []).find((r) => r.month === paidMonthYm)?.savings ?? 0,
    [monthlyBreakdownQuery.data, paidMonthYm],
  );

  const billsUnpaid = Math.max(0, billsTotal - billsPaid);
  const billsPaidPct = billsTotal > 0 ? Math.min(100, Math.round((billsPaid / billsTotal) * 100)) : 0;
  const unpaidCount = Math.max(0, monthBills.length - billsPaidCount);

  // Bills for the upcoming-bills ledger: unpaid (soonest first) before paid.
  const billItems = useMemo(() => {
    return monthBills
      .map((b) => {
        const paid = Number(paymentAmountByBillId[b.id] ?? 0) > 0;
        return {
          id: b.id,
          name: b.note?.trim() || "Planned expense",
          amount: b.amount,
          paid,
          // Auto-debit is inert where the mode switches it off, so the row must not claim
          // "scheduled" — it falls through to the normal due-date stamp instead.
          autoDebit: b.is_auto_debit && isFeatureEnabled("autoDebit"),
          due: effectiveDueDateInPaidMonth(b.due_date, paidMonthYm),
        };
      })
      .sort(
        (a, b) =>
          Number(a.paid) - Number(b.paid) ||
          (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity),
      );
  }, [monthBills, paymentAmountByBillId, paidMonthYm]);
  // Attention buckets for bills mode, read off the rows the ledger already built.
  // Overdue follows the bills board convention: unpaid with an effective due date
  // earlier than today; everything from today to the horizon is "due soon".
  const { overdueAmount, overdueCount, dueSoonAmount, dueSoonCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + DUE_SOON_DAYS);
    let overdueAmount = 0;
    let overdueCount = 0;
    let dueSoonAmount = 0;
    let dueSoonCount = 0;
    for (const b of billItems) {
      if (b.paid || !b.due) continue;
      if (b.due < today) {
        overdueAmount += b.amount;
        overdueCount += 1;
      } else if (b.due <= horizon) {
        dueSoonAmount += b.amount;
        dueSoonCount += 1;
      }
    }
    return { overdueAmount, overdueCount, dueSoonAmount, dueSoonCount };
  }, [billItems]);

  // The ledger runs full width in bills mode, so it has room for more rows.
  const visibleBills = billItems.slice(0, isBillsMode ? 10 : 6);

  const [amountsHidden, setAmountsHidden] = useState(false);
  useEffect(() => {
    setAmountsHidden(localStorage.getItem("omnitrak-amounts-hidden") === "1");
  }, []);
  function toggleAmountsHidden() {
    setAmountsHidden((prev) => {
      const next = !prev;
      localStorage.setItem("omnitrak-amounts-hidden", next ? "1" : "0");
      return next;
    });
  }

  const firstName = user ? getAccountDisplayName(user).split(" ")[0] : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* ════════════════════ ROW 1: STATEMENT HEADER ════════════════════ */}
      <header>
        {user && (
          <p className="text-sm text-muted-foreground">
            <GreetingText />, {firstName}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {isBillsMode ? "Due this month" : "Tracked balance"}
          </span>
          <button
            type="button"
            onClick={toggleAmountsHidden}
            aria-pressed={amountsHidden}
            aria-label={amountsHidden ? "Show amounts" : "Hide amounts"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:text-primary"
          >
            {amountsHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="fit-figure text-3xl font-bold tracking-tight sm:text-4xl">
            {amountsHidden ? MASK : <Amount value={isBillsMode ? billsTotal : totalTrackedBalance} />}
          </span>
          {isBillsMode ? (
            overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-warning px-2 py-1 text-xs font-medium text-warning">
                <TriangleAlert className="h-3 w-3" aria-hidden />
                {amountsHidden ? MASK : <Amount value={overdueAmount} />}
                <span className="text-warning/80">{overdueCount} overdue</span>
              </span>
            )
          ) : (
            savedThisMonth > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary px-2 py-1 text-xs font-medium text-primary">
                <ArrowUp className="h-3 w-3" aria-hidden />
                {amountsHidden ? MASK : <Amount value={savedThisMonth} />}
                <span className="text-primary/80">saved this month</span>
              </span>
            )
          )}
        </div>

        {isBillsMode ? (
          monthBills.length > 0 && (
            <p className="mt-3 flex max-w-xs items-baseline text-sm text-muted-foreground">
              <span>
                {monthBills.length}{" "}
                {monthBills.length === 1 ? "planned expense" : "planned expenses"}
              </span>
              <DotLeader />
              <span>{paidMonthDisplay}</span>
            </p>
          )
        ) : (
          includedAccountCount > 0 && (
            <p className="mt-3 flex max-w-xs items-baseline text-sm text-muted-foreground">
              <span>
                {includedAccountCount} {includedAccountCount === 1 ? "account" : "accounts"}
              </span>
              <DotLeader />
              <span>{paidMonthDisplay}</span>
            </p>
          )
        )}
      </header>

      {/* ════════════════════ ROW 2: STAT CELLS ════════════════════ */}
      <div className="surface mt-6 grid grid-cols-2 overflow-hidden border border-border bg-card sm:grid-cols-4">
        {isBillsMode ? (
          <>
            <StatCell
              href="/dashboard/planned-expenses"
              label="Still to pay"
              sub={unpaidCount > 0 ? `${unpaidCount} due this month` : "All settled"}
              dot={billsUnpaid > 0}
              borderClass={CELL_BORDERS[0]}
            >
              {amountsHidden ? MASK : <Amount value={billsUnpaid} />}
            </StatCell>
            <StatCell
              href="/dashboard/planned-expenses"
              label="Planned paid"
              sub={`${billsPaidCount}/${monthBills.length} paid this month`}
              borderClass={CELL_BORDERS[1]}
            >
              {amountsHidden ? MASK : <Amount value={billsPaid} />}
            </StatCell>
            <StatCell
              href="/dashboard/planned-expenses"
              label="Overdue"
              sub={overdueCount > 0 ? `${overdueCount} past due` : "None overdue"}
              dot={overdueCount > 0}
              borderClass={CELL_BORDERS[2]}
            >
              {amountsHidden ? MASK : <Amount value={overdueAmount} />}
            </StatCell>
            <StatCell
              href="/dashboard/planned-expenses"
              label="Due in 7 days"
              sub={dueSoonCount > 0 ? `${dueSoonCount} coming up` : "Nothing this week"}
              borderClass={CELL_BORDERS[3]}
            >
              {amountsHidden ? MASK : <Amount value={dueSoonAmount} />}
            </StatCell>
          </>
        ) : (
          <>
            <StatCell
              href="/dashboard/expenses"
              label="Spent this month"
              sub="So far this month"
              borderClass={CELL_BORDERS[0]}
            >
              {amountsHidden ? MASK : <Amount value={dailyAmt} />}
            </StatCell>
            <StatCell
              href="/dashboard/planned-expenses"
              label="Still to pay"
              sub={unpaidCount > 0 ? `${unpaidCount} due this month` : "All settled"}
              dot={billsUnpaid > 0}
              borderClass={CELL_BORDERS[1]}
            >
              {amountsHidden ? MASK : <Amount value={billsUnpaid} />}
            </StatCell>
            <StatCell
              href="/dashboard/planned-expenses"
              label="Planned paid"
              sub={`${billsPaidCount}/${monthBills.length} paid this month`}
              borderClass={CELL_BORDERS[2]}
            >
              {amountsHidden ? MASK : <Amount value={billsPaid} />}
            </StatCell>
            <StatCell
              href="/dashboard/accounts"
              label="Account balance"
              sub="Total tracked net balance"
              borderClass={CELL_BORDERS[3]}
            >
              {amountsHidden ? MASK : <Amount value={totalTrackedBalance} />}
            </StatCell>
          </>
        )}
      </div>

      {/* ════════════════════ ROW 3: CHART + UPCOMING BILLS ════════════════════ */}
      <div className={cn("mt-5 grid gap-5", !isBillsMode && "lg:grid-cols-3")}>
        {/* Chart — 2/3. Dropped in bills mode, where the ledger takes the full row. */}
        {!isBillsMode && (
          <section className="surface min-w-0 border border-border bg-card lg:col-span-2" aria-label="Spending, last 6 months">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
              <div>
                <h2 className="text-base font-bold tracking-tight">Spending, last 6 months</h2>
                <p className="text-xs text-muted-foreground">Planned vs actual • savings excluded</p>
              </div>
              <div className="flex gap-4" aria-hidden>
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <i className="h-2.5 w-2.5 rounded-[2px] bg-chart-compare" />
                  Planned
                </span>
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <i className="h-2.5 w-2.5 rounded-[2px] bg-primary" />
                  Spent
                </span>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              {(() => {
                if (monthlyBreakdownQuery.isPending) {
                  return <Skeleton className="h-[220px] w-full" />;
                }
                const breakdown = monthlyBreakdownQuery.data ?? [];
                const hasData = breakdown.some(
                  (r) => r.bills > 0 || r.billsPaid > 0 || r.expenses > 0 || r.savings > 0,
                );
                if (!breakdown.length || !hasData) {
                  return (
                    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                      No spending recorded yet.
                    </div>
                  );
                }
                const chartData = breakdown.map((r) => ({
                  month: new Date(`${r.month}-01`).toLocaleDateString("en-PH", { month: "short" }),
                  Planned: r.bills,
                  Spent: r.expenses + (r.billsPaid ?? 0),
                }));
                const fmtY = (v: number) =>
                  amountsHidden ? "•••" : v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`;
                const axisTick = {
                  fontSize: 11,
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  fill: "hsl(var(--muted-foreground))",
                };
                return (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="28%" barGap={3}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        tick={axisTick}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis tickFormatter={fmtY} tick={axisTick} tickLine={false} axisLine={false} width={44} />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground">
                              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                {label}
                              </p>
                              {payload.map((p) => (
                                <p key={p.dataKey as string} className="flex items-center justify-between gap-4 leading-5">
                                  <span className="flex items-center gap-2">
                                    <i className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: p.fill }} />
                                    {String(p.dataKey)}
                                  </span>
                                  {amountsHidden ? MASK : <Amount formatted={formatCurrency(Number(p.value))} />}
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="Planned" fill="hsl(var(--chart-compare))" radius={[2, 2, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="Spent" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </section>
        )}

        {/* Upcoming bills — 1/3, or the full row in bills mode */}
        <section className="surface min-w-0 overflow-hidden border border-border bg-card" aria-label="Upcoming bills">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
            <h2 className="text-base font-bold tracking-tight">Upcoming bills</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {paidMonthDisplay}
            </span>
          </div>

          {monthBills.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              No planned expenses this month.
            </div>
          ) : (
            <>
              {visibleBills.map((b) => (
                <div key={b.id} className="flex items-baseline gap-2 border-b border-border px-4 py-3 sm:px-5">
                  <span className={cn("min-w-0 flex-shrink truncate text-sm font-medium", b.paid && "text-muted-foreground line-through")}>
                    {b.name}
                  </span>
                  <DotLeader />
                  <span className={cn("shrink-0 text-sm", b.paid && "text-muted-foreground line-through")}>
                    {amountsHidden ? MASK : <Amount value={b.amount} />}
                  </span>
                  <Stamp
                    variant={b.paid ? "paid" : b.autoDebit ? "scheduled" : "due"}
                    className="ml-2 shrink-0 self-center"
                  >
                    {b.paid
                      ? "Paid"
                      : b.autoDebit
                      ? "Auto-debit"
                      : b.due
                      ? `Due ${b.due.toLocaleDateString(locale, { month: "short", day: "numeric" })}`
                      : "Due"}
                  </Stamp>
                </div>
              ))}

              <div className="flex items-baseline gap-2 bg-primary/5 px-4 py-3 sm:px-5">
                <span className="text-sm font-bold">Still to pay</span>
                <DotLeader />
                <span className="text-sm font-bold">
                  {amountsHidden ? MASK : <Amount value={billsUnpaid} />}
                </span>
              </div>

              {billItems.length > visibleBills.length && (
                <div className="border-t border-border px-4 py-3 sm:px-5">
                  <Link href="/dashboard/planned-expenses" className="text-xs font-medium text-primary hover:underline">
                    View all planned expenses
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ════════════════════ INSIGHT POPUP ════════════════════ */}
      {/* Only mount once every query the popup reads from has settled — */}
      {/* prevents the content from flipping as queries land one by one. */}
      {user && streakQuery.isSuccess && billsDataQuery.isSuccess && (
        <InsightPopup
          firstName={firstName}
          streak={streakQuery.data?.streak_count ?? 1}
          billsPaidPct={billsTotal > 0 ? billsPaidPct : undefined}
        />
      )}
    </div>
  );
}

function StatCell({
  href,
  label,
  sub,
  dot,
  borderClass,
  children,
}: {
  href: string;
  label: string;
  sub: string;
  dot?: boolean;
  borderClass: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "fit-figure p-4 transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:p-5",
        borderClass,
      )}
    >
      <p className={cn(CELL_LABEL, "min-w-0")}>
        {dot ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden /> : null}
        <span className="truncate">{label}</span>
      </p>
      <p className="fit-figure mt-2 text-base font-semibold sm:text-lg">{children}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
    </Link>
  );
}
