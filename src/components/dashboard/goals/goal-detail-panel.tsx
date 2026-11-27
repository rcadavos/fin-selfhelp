"use client";

import { Suspense, useState } from "react";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, PartyPopper, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormPanel } from "@/components/app/form-panel";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { SectionErrorBoundary } from "@/components/app/section-error-boundary";
import { Amount } from "@/components/passbook/amount";
import { GoalRing, GoalStatusLine } from "@/components/dashboard/goals/goal-parts";
import { goalDepositsQueryOptions } from "@/lib/query/my-goals";
import {
  depositDateLabel,
  goalMonthLabel,
  goalTypeLabel,
  type GoalProgress,
} from "@/lib/goals/progress";
import { GOAL_DEPOSITS_PREVIEW } from "@/lib/constants/goals";
import type { GoalDepositRow } from "@/actions/goals";

/** Every deposit on the goal, newest first, each removable; long histories fold after a few. */
function DepositHistory({
  goalId,
  currency,
  currentYear,
  deletingId,
  onDelete,
}: {
  goalId: string;
  currency: string;
  currentYear: number | undefined;
  deletingId: string | null;
  onDelete: (deposit: GoalDepositRow) => void;
}) {
  const { data: deposits } = useSuspenseQuery(goalDepositsQueryOptions(goalId));
  const [showAll, setShowAll] = useState(false);

  if (deposits.length === 0) {
    return (
      <p className="surface border border-dashed border-border px-4 py-6 text-center text-[12.5px] text-muted-foreground">
        Nothing added yet. Each amount you add shows here.
      </p>
    );
  }

  const shown = showAll ? deposits : deposits.slice(0, GOAL_DEPOSITS_PREVIEW);

  return (
    <>
      <ul className="surface divide-y divide-border overflow-hidden border border-border bg-card">
        {shown.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2.5 pl-3.5 pr-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{depositDateLabel(d.deposited_at, currentYear)}</p>
              {d.note && <p className="truncate text-[11.5px] text-muted-foreground">{d.note}</p>}
            </div>
            <Amount value={d.amount} currency={currency} className="shrink-0 text-sm" />
            <button
              type="button"
              onClick={() => onDelete(d)}
              disabled={deletingId === d.id}
              aria-label={`Remove ${depositDateLabel(d.deposited_at)} deposit`}
              className="tap-target flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
            >
              {deletingId === d.id ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
            </button>
          </li>
        ))}
      </ul>
      {deposits.length > GOAL_DEPOSITS_PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-[12.5px] font-medium text-primary hover:underline"
        >
          {showAll ? "Show fewer" : `Show all ${deposits.length}`}
        </button>
      )}
    </>
  );
}

/**
 * A goal opened from its card: where it stands, what to do next, its notes, and
 * every amount added to it. Editing and adding money open their own panels on top,
 * so this one is still here, up to date, when they close.
 */
export function GoalDetailPanel({
  open,
  progress,
  currency,
  todayYmd,
  busy,
  deletingDepositId,
  onClose,
  onAddMoney,
  onEdit,
  onMarkReached,
  onUnmarkReached,
  onDelete,
  onDeleteDeposit,
}: {
  open: boolean;
  progress: GoalProgress;
  currency: string;
  todayYmd: string | null;
  busy: boolean;
  deletingDepositId: string | null;
  onClose: () => void;
  onAddMoney: () => void;
  onEdit: () => void;
  onMarkReached: () => void;
  onUnmarkReached: () => void;
  onDelete: () => void;
  onDeleteDeposit: (deposit: GoalDepositRow) => void;
}) {
  const { goal, isReached, isFunded, hasTarget, remaining } = progress;
  const currentYear = todayYmd ? Number(todayYmd.slice(0, 4)) : undefined;

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogHeader className="flex-shrink-0 px-6 pb-2 pt-6">
        <DialogTitle className="pr-6">{goal.name}</DialogTitle>
        <DialogDescription>
          {goalTypeLabel(goal.goal_type)} <span aria-hidden>•</span> since{" "}
          {goalMonthLabel(goal.date_set_month, goal.date_set_year)}
        </DialogDescription>
      </DialogHeader>

      <ScrollFadeBody className="space-y-5 px-6 pb-4">
        <div className="surface border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-3.5">
            <GoalRing progress={progress} className="size-16" />
            <div className="min-w-0">
              <Amount
                value={goal.total_deposited}
                currency={currency}
                className="block text-2xl font-semibold tracking-tight"
              />
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {hasTarget ? (
                  <>
                    of <Amount value={goal.target_amount!} currency={currency} />
                    {!isReached && remaining !== null && remaining > 0 && (
                      <>
                        {" "}
                        <span aria-hidden>•</span> <Amount value={remaining} currency={currency} /> to go
                      </>
                    )}
                  </>
                ) : (
                  "saved • no target set"
                )}
              </p>
            </div>
          </div>
          <GoalStatusLine progress={progress} currency={currency} todayYmd={todayYmd} className="mt-3" />
        </div>

        {isFunded && (
          <div className="surface flex flex-wrap items-center gap-3 border border-primary/30 bg-primary/5 p-3.5">
            <p className="min-w-0 flex-1 text-[13px]">
              You&rsquo;ve saved the whole target. Mark it reached to celebrate and move it to Reached.
            </p>
            <Button type="button" size="sm" className="gap-1" onClick={onMarkReached} disabled={busy}>
              <PartyPopper className="size-3.5" aria-hidden />
              Mark reached
            </Button>
          </div>
        )}

        {isReached && (
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-muted-foreground">Not quite there after all?</span>
            <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={onUnmarkReached} disabled={busy}>
              <RotateCcw className="size-3.5" aria-hidden />
              Not reached yet
            </Button>
          </div>
        )}

        {goal.notes?.trim() && (
          <section>
            <h4 className="mb-1.5 text-sm font-semibold">Notes</h4>
            <p className="whitespace-pre-line break-words text-[13px] text-muted-foreground">{goal.notes.trim()}</p>
          </section>
        )}

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold">Money added</h4>
            {goal.deposit_count > 0 && (
              <span className="text-[12px] text-muted-foreground">
                {goal.deposit_count} {goal.deposit_count === 1 ? "deposit" : "deposits"}
              </span>
            )}
          </div>
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <SectionErrorBoundary
                resetKey={goal.id}
                onReset={reset}
                fallback={(retry) => (
                  <p className="text-[12.5px] text-muted-foreground">
                    Couldn&rsquo;t load the money added to this goal.{" "}
                    <button type="button" onClick={retry} className="font-medium text-primary hover:underline">
                      Try again
                    </button>
                  </p>
                )}
              >
                <Suspense
                  fallback={
                    <div className="flex justify-center py-6">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />
                    </div>
                  }
                >
                  <DepositHistory
                    goalId={goal.id}
                    currency={currency}
                    currentYear={currentYear}
                    deletingId={deletingDepositId}
                    onDelete={onDeleteDeposit}
                  />
                </Suspense>
              </SectionErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </section>
      </ScrollFadeBody>

      <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3 [&_button]:h-11">
        <div className="flex w-full items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-11 flex-none rounded-full text-destructive hover:bg-destructive/15 hover:text-destructive"
            aria-label={`Delete ${goal.name}`}
            onClick={onDelete}
            disabled={busy}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={onEdit} disabled={busy}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
          {!isReached && (
            <Button type="button" className="flex-1 gap-1.5" onClick={onAddMoney} disabled={busy}>
              <Plus className="size-4" aria-hidden />
              Add money
            </Button>
          )}
        </div>
      </DialogFooter>
    </FormPanel>
  );
}
