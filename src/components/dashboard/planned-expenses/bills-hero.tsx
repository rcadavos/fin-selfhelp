"use client";

import { AlertCircle, Check, PartyPopper, Pencil, SkipForward, X } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import type { PlannedExpenseRow } from "@/lib/planned-expenses/grouping";

function shortDue(row: PlannedExpenseRow): string {
  return row.due ? ` — ${row.due.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}` : "";
}

/** Bills skipped this month, each with a way back into the panel. */
function SkippedList({
  skipped,
  onUnskip,
}: {
  skipped: PlannedExpenseRow[];
  onUnskip: (billId: string) => void;
}) {
  if (skipped.length === 0) return null;
  return (
    <div className="mt-4 border-t border-panel-foreground/15 pt-3">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-panel-muted opacity-80">
        Skipped this month
      </p>
      <div className="mt-1.5 flex flex-col gap-1">
        {skipped.map((row) => (
          <div key={row.bill.id} className="flex items-baseline text-[12.5px] text-panel-muted">
            <span className="min-w-0 truncate pb-0.5">
              {row.bill.note ?? "Bill"}
              {shortDue(row)}
            </span>
            <DotLeader className="border-panel-foreground/25" />
            <button
              type="button"
              onClick={() => onUnskip(row.bill.id)}
              aria-label={`Bring back ${row.bill.note ?? "bill"}`}
              className="tap-target shrink-0 rounded-md px-1.5 py-0.5 font-medium text-panel-accent transition-colors hover:bg-panel-foreground/10"
            >
              Bring back
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Bills mode exists to answer one question: what needs me now, and did I pay it.
 *
 * With auto-debit off in this mode, every unpaid bill needs a human — so the page
 * opens on the single most urgent one with its verb attached, instead of making
 * you find it in a list. Settling it promotes the next bill in the queue.
 *
 * Part-paid bills never appear here — you have already acted on them, and the
 * list below still carries what is left on each. Neither do bills skipped for
 * this month; they are listed at the foot of the panel so they can be brought back.
 *
 * On wide screens the panel also heads the side rail in the full app. There
 * auto-debit can be on, and bills that will pay themselves are left out, which is
 * why the empty state has to know how many of them are still pending.
 */
export function BillsHero({
  next,
  queue,
  skipped,
  partPaidCount,
  autoDebitPendingCount = 0,
  currency,
  onMarkPaid,
  onPartialPayment,
  onEdit,
  onSkip,
  onUnskip,
  onDismiss,
  isPending,
}: {
  /** The most urgent bill with nothing paid yet, or null when none is left. */
  next: PlannedExpenseRow | null;
  /** What follows it — the next few, soonest first. */
  queue: PlannedExpenseRow[];
  /** Unpaid bills skipped for this month, soonest first. */
  skipped: PlannedExpenseRow[];
  /** Bills started but not finished; only shapes the empty-state copy. */
  partPaidCount: number;
  /** Unpaid bills left out because auto-debit will pay them; only shapes the empty-state copy. */
  autoDebitPendingCount?: number;
  currency: string;
  onMarkPaid: () => void;
  onPartialPayment: () => void;
  /** Opens the featured bill in the edit form. */
  onEdit: () => void;
  /** Skips the featured bill for this month (saved), so the next one takes its place. */
  onSkip: () => void;
  /** Puts a skipped bill back in the queue for this month. */
  onUnskip: (billId: string) => void;
  /** Hides the panel for this visit only — deliberately not persisted. */
  onDismiss: () => void;
  isPending: boolean;
}) {
  const ledgerRule =
    "after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(hsl(var(--panel-accent)/0.055)_0_1px,transparent_1px_26px)]";

  if (!next) {
    const hasSkipped = skipped.length > 0;
    const autoCount = autoDebitPendingCount;
    const allSettled = partPaidCount === 0 && !hasSkipped && autoCount === 0;
    const autoOnly = partPaidCount === 0 && !hasSkipped && autoCount > 0;
    // "paid", "paid or started", "paid, started or on auto-debit" …
    const states = ["paid", ...(partPaidCount > 0 ? ["started"] : []), ...(autoCount > 0 ? ["on auto-debit"] : [])];
    const statesText = states.length > 1 ? `${states.slice(0, -1).join(", ")} or ${states[states.length - 1]}` : states[0];
    return (
      <div className={`relative overflow-hidden rounded-[calc(var(--radius)+2px)] bg-panel p-5 text-panel-foreground shadow-[var(--shadow)] ${ledgerRule}`}>
        <div className="relative z-10">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.11em] text-panel-accent">
            <PartyPopper className="size-3" aria-hidden />
            {allSettled
              ? "Nothing left this month"
              : hasSkipped
                ? "Nothing else this month"
                : autoOnly
                  ? "Nothing needs you"
                  : "Nothing new this month"}
          </p>
          <p className="mt-2 text-[22px] font-semibold leading-tight tracking-tight">
            {allSettled
              ? "All settled"
              : hasSkipped
                ? "Only skipped bills left"
                : autoOnly
                  ? "Auto-debit has the rest"
                  : "All started"}
          </p>
          <p className="mt-1.5 text-[12.5px] text-panel-muted">
            {allSettled
              ? "Every bill this month is paid. Nothing needs you."
              : hasSkipped
                ? `Every other bill this month is ${statesText}. Skipped bills are still in the list below, and come back here next month.`
                : autoOnly
                  ? `${autoCount} bill${autoCount === 1 ? "" : "s"} left this month ${
                      autoCount === 1 ? "is" : "are"
                    } on auto-debit and will be paid automatically.`
                  : `${
                      autoCount > 0
                        ? "Every bill this month is started or on auto-debit."
                        : "Every bill this month has a payment on it."
                    } ${partPaidCount} still ${
                      partPaidCount === 1 ? "has a balance" : "have balances"
                    } — see the list below.`}
          </p>
          <SkippedList skipped={skipped} onUnskip={onUnskip} />
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
        <div className="flex items-start justify-between gap-2">
          <p
            className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.11em] ${
              isLate ? "text-[hsl(4.5_69%_72%)]" : "text-panel-accent"
            }`}
          >
            <AlertCircle className="size-3" aria-hidden />
            {isLate ? "Needs you now" : "Coming up"}
          </p>
          <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onSkip}
              disabled={isPending}
              aria-label={`Skip ${next.bill.note ?? "this bill"} this month`}
              title="Skip this month and show the next bill"
              className="tap-target inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-panel-muted transition-colors hover:bg-panel-foreground/10 hover:text-panel-foreground disabled:opacity-60"
            >
              <SkipForward className="size-3.5" aria-hidden />
              Skip
            </button>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${next.bill.note ?? "bill"}`}
              title="Edit bill"
              className="tap-target flex size-6 items-center justify-center rounded-full text-panel-muted transition-colors hover:bg-panel-foreground/10 hover:text-panel-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Hide this panel until next visit"
              className="tap-target flex size-6 items-center justify-center rounded-full text-panel-muted transition-colors hover:bg-panel-foreground/10 hover:text-panel-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <p className="mt-2 text-[22px] font-semibold leading-tight tracking-tight">
          {next.bill.note ?? "Bill"}
        </p>
        {/* Keyed by bill, so the next bill in the queue counts up from 0 rather
            than rolling over from the amount of the one just settled. */}
        <CountUpAmount
          key={next.bill.id}
          value={next.outstanding}
          currency={currency}
          className="mt-1 block text-[34px] font-semibold tracking-tight"
        />

        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-panel-muted">
          {dueLabel && <span>{isLate ? "Was due" : "Due"} {dueLabel}</span>}
          {dueLabel && whenLabel && <span className="opacity-50">•</span>}
          {whenLabel && <span>{whenLabel}</span>}
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
                    {row.bill.note ?? "Bill"}
                    {shortDue(row)}
                  </span>
                  <DotLeader className="border-panel-foreground/25" />
                  <span className="fit-figure shrink-0 pb-0.5 text-panel-foreground">
                    <Amount value={row.outstanding} currency={currency} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <SkippedList skipped={skipped} onUnskip={onUnskip} />
      </div>
    </div>
  );
}
