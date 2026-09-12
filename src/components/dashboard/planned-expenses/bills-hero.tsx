"use client";

import { AlertCircle, Check, PartyPopper } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { formatCurrency } from "@/lib/utils";
import type { PlannedExpenseRow } from "@/lib/planned-expenses/grouping";

/**
 * Bills mode exists to answer one question: what needs me now, and did I pay it.
 *
 * With auto-debit off in this mode, every unpaid bill needs a human — so the page
 * opens on the single most urgent one with its verb attached, instead of making
 * you find it in a list. Settling it promotes the next bill in the queue.
 */
export function BillsHero({
  next,
  queue,
  currency,
  onMarkPaid,
  onPartialPayment,
  isPending,
}: {
  /** The most urgent unsettled bill, or null when the month is clear. */
  next: PlannedExpenseRow | null;
  /** What follows it — the next few, soonest first. */
  queue: PlannedExpenseRow[];
  currency: string;
  onMarkPaid: () => void;
  onPartialPayment: () => void;
  isPending: boolean;
}) {
  const ledgerRule =
    "after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(hsl(var(--panel-accent)/0.055)_0_1px,transparent_1px_26px)]";

  if (!next) {
    return (
      <div className={`relative overflow-hidden rounded-[calc(var(--radius)+2px)] bg-panel p-5 text-panel-foreground shadow-[var(--shadow)] ${ledgerRule}`}>
        <div className="relative z-10">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.11em] text-panel-accent">
            <PartyPopper className="size-3" aria-hidden />
            Nothing left this month
          </p>
          <p className="mt-2 text-[22px] font-semibold leading-tight tracking-tight">All settled</p>
          <p className="mt-1.5 text-[12.5px] text-panel-muted">
            Every bill this month is paid. Nothing needs you.
          </p>
        </div>
      </div>
    );
  }

  const isLate = next.daysFromToday !== null && next.daysFromToday < 0;
  const dueLabel = next.due
    ? next.due.toLocaleDateString("en-PH", { month: "long", day: "numeric" })
    : null;
  const whenLabel =
    next.daysFromToday === null
      ? null
      : next.daysFromToday < 0
        ? `${Math.abs(next.daysFromToday)} day${Math.abs(next.daysFromToday) === 1 ? "" : "s"} late`
        : next.daysFromToday === 0
          ? "Due today"
          : `in ${next.daysFromToday} day${next.daysFromToday === 1 ? "" : "s"}`;

  return (
    <div className={`relative overflow-hidden rounded-[calc(var(--radius)+2px)] bg-panel p-5 text-panel-foreground shadow-[var(--shadow)] ${ledgerRule}`}>
      <div className="relative z-10">
        <p
          className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.11em] ${
            isLate ? "text-[hsl(4.5_69%_72%)]" : "text-panel-accent"
          }`}
        >
          <AlertCircle className="size-3" aria-hidden />
          {isLate ? "Needs you now" : "Coming up"}
        </p>

        <p className="mt-2 text-[22px] font-semibold leading-tight tracking-tight">
          {next.bill.note ?? "Planned expense"}
        </p>
        <Amount
          value={next.outstanding}
          currency={currency}
          className="mt-1 block text-[34px] font-semibold tracking-tight"
        />

        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-panel-muted">
          {dueLabel && <span>{isLate ? "Was due" : "Due"} {dueLabel}</span>}
          {dueLabel && whenLabel && <span className="opacity-50">•</span>}
          {whenLabel && <span>{whenLabel}</span>}
          {next.amountPaid > 0 && (
            <>
              <span className="opacity-50">•</span>
              <span>{formatCurrency(next.amountPaid, currency)} already paid</span>
            </>
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMarkPaid}
            disabled={isPending}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-panel-accent px-4 py-2.5 text-[13.5px] font-semibold text-panel transition-[filter] hover:brightness-110 disabled:opacity-60"
          >
            <Check className="size-4" strokeWidth={3} aria-hidden />
            Mark paid
          </button>
          <button
            type="button"
            onClick={onPartialPayment}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-panel-foreground/30 px-4 py-2.5 text-[13.5px] font-semibold text-panel-foreground transition-colors hover:bg-panel-foreground/10 disabled:opacity-60"
          >
            Part payment
          </button>
        </div>

        {queue.length > 0 && (
          <div className="mt-4 border-t border-panel-foreground/15 pt-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-panel-muted opacity-80">Then</p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {queue.map((row) => (
                <div key={row.bill.id} className="flex items-baseline text-[12.5px] text-panel-muted">
                  <span className="min-w-0 truncate pb-0.5">
                    {row.bill.note ?? "Planned expense"}
                    {row.due && ` — ${row.due.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`}
                  </span>
                  <DotLeader className="border-panel-foreground/25" />
                  <span className="fit-figure shrink-0 pb-0.5 text-panel-foreground">
                    <Amount value={row.outstanding} currency={currency} />
                    {row.amountPaid > 0 && <span className="ml-1 text-panel-muted">left</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
