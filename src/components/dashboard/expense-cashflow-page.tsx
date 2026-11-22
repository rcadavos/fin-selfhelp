"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { ArrowUp, Check, Eye, EyeOff, List, Plus, Receipt, TriangleAlert, Wallet } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useAppMode } from "@/hooks/use-app-mode";
import { parseYmToYearMonth, effectiveDueDateInPaidMonth } from "@/lib/expense-due-date";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { billsDataQueryOptions } from "@/lib/query/bills";
import { accountsQueryOptions, accountBalancesQueryOptions } from "@/lib/query/accounts";
import { EXPENSE_PAYMENT_HISTORY_MONTHS, monthlyBreakdownQueryOptions } from "@/lib/query/expenses";
import { userStreakQueryOptions } from "@/lib/query/streaks";
import { ADD_PLANNED_EXPENSE_PARAM } from "@/lib/constants/app-mode";
import {
  AMOUNT_MASK,
  AMOUNTS_HIDDEN_STORAGE_KEY,
  DASHBOARD_BILL_ROWS,
  DASHBOARD_GREETING_FALLBACK,
  DASHBOARD_GREETINGS,
} from "@/lib/constants/dashboard";
import { cn } from "@/lib/utils";
import { getAccountDisplayName } from "@/components/app/account-dropdown-menu";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { AddEntryPanel, type EntryTab } from "@/components/dashboard/add-entry-panel";
import { StreakCard } from "@/components/dashboard/streak-card";
import {
  BillsToPayCard,
  isBillFullyPaid,
  type DashboardBillItem,
} from "@/components/dashboard/home/bills-to-pay-card";
import { SpendingCompareCard } from "@/components/dashboard/home/spending-compare-card";

export type ExpenseCashflowPageVariant = "dashboard";

/**
 * The greeting and today's date come from the reader's own clock, so both are filled
 * in after mount: the server's clock and time zone are not the reader's, and
 * rendering them during SSR would trip a hydration mismatch.
 */
function useLocalDay(locale: string): { greeting: string; date: string } | null {
  const [day, setDay] = useState<{ greeting: string; date: string } | null>(null);
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setDay({
      greeting:
        DASHBOARD_GREETINGS.find((g) => hour < g.beforeHour)?.text ?? DASHBOARD_GREETING_FALLBACK,
      date: now.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });
  }, [locale]);
  return day;
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

/** One of the two big figures in "Your money at a glance". */
function GlanceCell({
  icon: Icon,
  label,
  value,
  isLoading,
  hidden,
  second = false,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  isLoading: boolean;
  hidden: boolean;
  /** The right-hand cell: tinted, and ruled off from the first. */
  second?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "fit-figure p-5 sm:p-7",
        second && "border-t border-border bg-primary/[0.04] sm:border-l sm:border-t-0",
      )}
    >
      <p className="flex items-center gap-2 text-base font-semibold text-muted-foreground sm:text-lg">
        <Icon className="size-5 shrink-0" aria-hidden />
        {label}
      </p>
      {isLoading ? (
        <>
          <Skeleton className="mt-3 h-11 w-60 max-w-full" />
          <Skeleton className="mt-4 h-5 w-44" />
        </>
      ) : (
        <>
          <p className="fit-figure mt-2 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {hidden ? AMOUNT_MASK : <CountUpAmount value={value} />}
          </p>
          {children}
        </>
      )}
    </div>
  );
}

type QuickAction = { label: string; icon: LucideIcon; primary?: boolean } & (
  | { href: string }
  | { onClick: () => void }
);

const QUICK_ACTION_CLASS =
  "h-auto min-h-14 w-full gap-2.5 whitespace-normal rounded-xl px-5 py-3 text-lg font-bold [&_svg:not([class*='size-'])]:size-6";
const QUICK_ACTION_PRIMARY = "bg-primary text-primary-foreground hover:bg-primary/90";
const QUICK_ACTION_SECONDARY =
  "border-2 border-primary bg-card text-primary hover:bg-primary/5 hover:text-primary";

/**
 * The dashboard, written for readers who are not comfortable with apps: large type,
 * plain words, two big figures, one obvious button per job, and the month's bills
 * with a Mark as paid button on each.
 */
export function ExpenseCashflowPage({
  pageVariant,
}: {
  pageVariant: ExpenseCashflowPageVariant;
}) {
  // pageVariant is kept for backwards compatibility with the dashboard page,
  // but only "dashboard" is supported now.
  void pageVariant;

  const { user } = useUser();
  const { isBillsMode, isFeatureEnabled } = useAppMode();
  const paidMonthQueryKey = getCurrentPaidMonth();
  // Bills mode drops the accounts and spending sections, so the three queries feeding
  // them are conditional. `enabled` is why they stay `useQuery`: `useSuspenseQuery`
  // cannot switch a query off.
  const monthlyBreakdownQuery = useQuery({
    ...monthlyBreakdownQueryOptions(EXPENSE_PAYMENT_HISTORY_MONTHS),
    enabled: !isBillsMode,
  });
  const accountsQuery = useQuery({ ...accountsQueryOptions(), enabled: !isBillsMode });
  const accountBalancesQuery = useQuery({
    ...accountBalancesQueryOptions(),
    enabled: !isBillsMode,
  });
  const billsDataQuery = useQuery(billsDataQueryOptions(paidMonthQueryKey));
  const streakQuery = useQuery(userStreakQueryOptions());
  const prefsOptional = useUserPreferencesOptional();

  const locale =
    (prefsOptional?.preferences?.language ?? DEFAULT_USER_PREFERENCES.language) === "fil"
      ? "fil-PH"
      : "en-PH";
  const localDay = useLocalDay(locale);

  const paidMonthLabel = billsDataQuery.data?.paidMonth ?? paidMonthQueryKey;
  const paidMonthYm = useMemo(
    () => (/^\d{4}-\d{2}$/.test(paidMonthLabel) ? paidMonthLabel : getCurrentPaidMonth()),
    [paidMonthLabel],
  );
  const paidMonthDisplay = useMemo(() => {
    const ym = parseYmToYearMonth(paidMonthYm);
    if (!ym) return paidMonthYm;
    return new Date(ym.year, ym.month1to12 - 1, 1).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  }, [paidMonthYm, locale]);

  const billsList = billsDataQuery.data?.bills ?? [];
  const paymentAmountByBillId = billsDataQuery.data?.paymentAmountByBillId ?? {};
  const failedBillIds = billsDataQuery.data?.failedBillIds;
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
  const monthBillIds = useMemo(() => new Set(monthBills.map((b) => b.id)), [monthBills]);
  const billsPaid = useMemo(
    () =>
      Object.entries(paymentAmountByBillId)
        .filter(([id]) => monthBillIds.has(id))
        .reduce((s, [, v]) => s + Number(v ?? 0), 0),
    [paymentAmountByBillId, monthBillIds],
  );
  const billsUnpaid = Math.max(0, billsTotal - billsPaid);

  // This month's bills, soonest due first. Rows keep this order whether paid or not,
  // so a bill marked paid from the list stays where the reader last saw it.
  const billItems = useMemo<DashboardBillItem[]>(() => {
    const failed = new Set(failedBillIds ?? []);
    return monthBills
      .map((b) => ({
        id: b.id,
        name: b.note?.trim() || "Bill",
        amount: b.amount,
        paidAmount: Number(paymentAmountByBillId[b.id] ?? 0),
        // Auto-debit is inert where the mode switches it off, so the row must not
        // claim "pays itself" there; it falls through to the normal due-date pill.
        autoDebit: Boolean(b.is_auto_debit) && isFeatureEnabled("autoDebit"),
        autoDebitFailed: failed.has(b.id),
        due: effectiveDueDateInPaidMonth(b.due_date, paidMonthYm),
      }))
      .sort(
        (a, b) =>
          (a.due?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (b.due?.getTime() ?? Number.MAX_SAFE_INTEGER),
      );
  }, [monthBills, paymentAmountByBillId, failedBillIds, isFeatureEnabled, paidMonthYm]);

  const fullyPaidCount = useMemo(() => billItems.filter(isBillFullyPaid).length, [billItems]);
  const billsLeftCount = billItems.length - fullyPaidCount;
  const paidShare = billItems.length > 0 ? (fullyPaidCount / billItems.length) * 100 : 0;

  // Bills mode's second glance figure: what is still owed on bills past their due date.
  const { overdueAmount, overdueCount } = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let amount = 0;
    let count = 0;
    for (const b of billItems) {
      if (isBillFullyPaid(b) || !b.due || b.due >= startOfToday) continue;
      amount += b.amount - b.paidAmount;
      count += 1;
    }
    return { overdueAmount: amount, overdueCount: count };
  }, [billItems]);

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
  const accountNames = useMemo(
    () =>
      Object.fromEntries(
        (accountsQuery.data ?? []).map((a) => [a.id, a.account_alias?.trim() || a.bank_name]),
      ),
    [accountsQuery.data],
  );

  // Savings deposited this month: a real, positive movement in tracked holdings.
  const savedThisMonth = useMemo(
    () => (monthlyBreakdownQuery.data ?? []).find((r) => r.month === paidMonthYm)?.savings ?? 0,
    [monthlyBreakdownQuery.data, paidMonthYm],
  );

  const billsLoading = billsDataQuery.isPending;
  const accountsLoading =
    !isBillsMode && (accountsQuery.isPending || accountBalancesQuery.isPending);

  const [amountsHidden, setAmountsHidden] = useState(false);
  useEffect(() => {
    setAmountsHidden(localStorage.getItem(AMOUNTS_HIDDEN_STORAGE_KEY) === "1");
  }, []);
  function toggleAmountsHidden() {
    setAmountsHidden((prev) => {
      const next = !prev;
      localStorage.setItem(AMOUNTS_HIDDEN_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  // The Add Entry panel opens on the tab the quick action asked for. It is mounted on
  // first use only, and re-keyed by tab because it reads `initialTab` once.
  const canQuickAdd = isFeatureEnabled("quickAddEntry");
  const [entryTab, setEntryTab] = useState<EntryTab>("expense");
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryMounted, setEntryMounted] = useState(false);
  function openEntry(tab: EntryTab) {
    setEntryTab(tab);
    setEntryMounted(true);
    setEntryOpen(true);
  }

  const markPaidHref = billItems.some((b) => !isBillFullyPaid(b))
    ? "#bills-to-pay"
    : "/dashboard/bills";
  const quickActions: QuickAction[] = canQuickAdd
    ? [
        { label: "Add spending", icon: Plus, primary: true, onClick: () => openEntry("expense") },
        { label: "Mark a bill as paid", icon: Check, href: markPaidHref },
        { label: "Add money to an account", icon: Wallet, onClick: () => openEntry("income") },
      ]
    : [
        {
          label: "Add a bill",
          icon: Plus,
          primary: true,
          href: `/dashboard/bills?${ADD_PLANNED_EXPENSE_PARAM}=1`,
        },
        { label: "Mark a bill as paid", icon: Check, href: markPaidHref },
        { label: "See all my bills", icon: List, href: "/dashboard/bills" },
      ];

  const firstName = user ? getAccountDisplayName(user).split(" ")[0] : "";

  const billsLeftCell = (
    <GlanceCell
      icon={Receipt}
      label="Bills left to pay this month"
      value={billsUnpaid}
      isLoading={billsLoading}
      hidden={amountsHidden}
      second={!isBillsMode}
    >
      {billItems.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">No bills this month</p>
      ) : (
        <>
          <div aria-hidden className="mt-4 h-3 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${paidShare}%` }}
            />
          </div>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">
            <strong className="font-semibold text-foreground">
              {fullyPaidCount} of {billItems.length} {billItems.length === 1 ? "bill" : "bills"} paid
            </strong>
            {" • "}
            {billsLeftCount === 0 ? "all done" : `${billsLeftCount} still to pay`}
          </p>
        </>
      )}
    </GlanceCell>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* ════════════════════ GREETING ════════════════════ */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="min-h-7 text-base text-muted-foreground sm:text-lg">{localDay?.date ?? ""}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {localDay?.greeting ?? DASHBOARD_GREETING_FALLBACK}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={toggleAmountsHidden}
          className="h-auto min-h-12 gap-2 rounded-lg border-2 border-hairline-strong bg-card px-4 text-base font-semibold [&_svg:not([class*='size-'])]:size-5"
        >
          {amountsHidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {amountsHidden ? "Show amounts" : "Hide amounts"}
        </Button>
      </header>

      {/* ════════════════════ YOUR MONEY AT A GLANCE ════════════════════ */}
      <section
        aria-label="Your money at a glance"
        className="surface mt-6 grid overflow-hidden border border-border bg-card sm:grid-cols-2"
      >
        {isBillsMode ? (
          <>
            {billsLeftCell}
            <GlanceCell
              icon={TriangleAlert}
              label="Overdue"
              value={overdueAmount}
              isLoading={billsLoading}
              hidden={amountsHidden}
              second
            >
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                {overdueCount > 0
                  ? `${overdueCount} ${overdueCount === 1 ? "bill is" : "bills are"} past the due date`
                  : "Nothing overdue"}
              </p>
            </GlanceCell>
          </>
        ) : (
          <>
            <GlanceCell
              icon={Wallet}
              label="Money in your accounts"
              value={totalTrackedBalance}
              isLoading={accountsLoading}
              hidden={amountsHidden}
            >
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-muted-foreground sm:text-lg">
                {includedAccountCount === 0 ? (
                  <Link
                    href="/dashboard/accounts"
                    className="inline-flex min-h-11 items-center font-bold text-primary hover:underline"
                  >
                    Add your first account
                  </Link>
                ) : (
                  <span>
                    Across {includedAccountCount} {includedAccountCount === 1 ? "account" : "accounts"}
                  </span>
                )}
                {savedThisMonth > 0 && (
                  <>
                    <span aria-hidden>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <ArrowUp className="size-4" aria-hidden />
                      {amountsHidden ? AMOUNT_MASK : <CountUpAmount value={savedThisMonth} />}
                      <span>saved this month</span>
                    </span>
                  </>
                )}
              </p>
            </GlanceCell>
            {billsLeftCell}
          </>
        )}
      </section>

      {/* ════════════════════ QUICK ACTIONS ════════════════════ */}
      <section aria-labelledby="quick-actions-heading" className="mt-8">
        <h2 id="quick-actions-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
          What would you like to do?
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const className = cn(
              QUICK_ACTION_CLASS,
              action.primary ? QUICK_ACTION_PRIMARY : QUICK_ACTION_SECONDARY,
            );
            return "href" in action ? (
              <Button
                key={action.label}
                asChild
                variant={action.primary ? "default" : "outline"}
                className={className}
              >
                <Link href={action.href}>
                  <Icon aria-hidden />
                  {action.label}
                </Link>
              </Button>
            ) : (
              <Button
                key={action.label}
                type="button"
                variant={action.primary ? "default" : "outline"}
                onClick={action.onClick}
                className={className}
              >
                <Icon aria-hidden />
                {action.label}
              </Button>
            );
          })}
        </div>
      </section>

      {/* ════════════════════ BILLS TO PAY + SPENDING ════════════════════ */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3 lg:items-start">
        <div className="min-w-0 lg:col-span-2">
          <BillsToPayCard
            items={billItems}
            paidMonth={paidMonthQueryKey}
            monthLabel={paidMonthDisplay}
            isLoading={billsLoading}
            amountsHidden={amountsHidden}
            locale={locale}
            stillToPay={billsUnpaid}
            rowLimit={isBillsMode ? DASHBOARD_BILL_ROWS.bills : DASHBOARD_BILL_ROWS.full}
            accountNames={accountNames}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {!isBillsMode && (
            <SpendingCompareCard
              rows={monthlyBreakdownQuery.data ?? []}
              isPending={monthlyBreakdownQuery.isPending}
              paidMonthYm={paidMonthYm}
              locale={locale}
              amountsHidden={amountsHidden}
            />
          )}
          {user && streakQuery.isSuccess && (
            <StreakCard streak={streakQuery.data?.streak_count ?? 1} firstName={firstName} />
          )}
        </div>
      </div>

      {canQuickAdd && entryMounted && (
        <AddEntryPanel
          key={entryTab}
          open={entryOpen}
          initialTab={entryTab}
          onClose={() => setEntryOpen(false)}
        />
      )}
    </div>
  );
}
