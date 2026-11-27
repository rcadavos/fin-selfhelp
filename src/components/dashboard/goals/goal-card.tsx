"use client";

import { Loader2, MoreHorizontal, Pencil, PartyPopper, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import { GoalRing, GoalStatusLine, lastAddedLabel } from "@/components/dashboard/goals/goal-parts";
import { cn } from "@/lib/utils";
import { goalMonthLabel, goalTypeLabel, type GoalProgress } from "@/lib/goals/progress";

/**
 * One goal: how much of it is saved (the ring), the amount against the target,
 * one line saying whether it is on its way, and the next thing to do with it —
 * add money, or mark it reached once the target is met. The whole card opens the
 * goal's details; the button and the menu sit above that.
 */
export function GoalCard({
  progress,
  currency,
  todayYmd,
  justReached,
  busy,
  onOpen,
  onAddMoney,
  onEdit,
  onMarkReached,
  onUnmarkReached,
  onUndoReached,
  onDelete,
}: {
  progress: GoalProgress;
  currency: string;
  todayYmd: string | null;
  /** Marked reached during this visit: the stamp presses on and an Undo stays in the footer. */
  justReached: boolean;
  /** A save or delete for this goal is in flight. */
  busy: boolean;
  onOpen: () => void;
  onAddMoney: () => void;
  onEdit: () => void;
  onMarkReached: () => void;
  /** Asks before clearing the reached date. */
  onUnmarkReached: () => void;
  /** Straight undo of a reach made this visit, no question asked. */
  onUndoReached: () => void;
  onDelete: () => void;
}) {
  const { goal, isReached, isFunded, hasTarget } = progress;
  const meta = `${goalTypeLabel(goal.goal_type)} • since ${goalMonthLabel(goal.date_set_month, goal.date_set_year)}`;

  return (
    <article
      className={cn(
        "group surface relative flex min-w-0 flex-col border bg-card p-4 shadow-[var(--shadow)] transition-colors hover:border-primary/40",
        isReached ? "border-primary/30" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <GoalRing progress={progress} className="pointer-events-none" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-[15px] font-semibold leading-snug">
            {/* Stretched over the whole card, so anywhere on it opens the details. */}
            <button
              type="button"
              onClick={onOpen}
              className="text-left outline-none after:absolute after:inset-0 after:rounded-[0.875rem] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {goal.name}
            </button>
          </h3>
          <p className="truncate text-[12px] text-muted-foreground">{meta}</p>
        </div>
        {isReached && (
          <Stamp variant="paid" className={cn("mt-1 shrink-0", justReached && "stamp-press")}>
            Reached
          </Stamp>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="relative z-10 -mr-1.5 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`More for ${goal.name}`}
              disabled={busy}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <MoreHorizontal aria-hidden />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!isReached && (
              <DropdownMenuItem className="cursor-pointer" onSelect={onAddMoney}>
                <Plus aria-hidden />
                Add money
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer" onSelect={onEdit}>
              <Pencil aria-hidden />
              Edit goal
            </DropdownMenuItem>
            {isReached ? (
              <DropdownMenuItem className="cursor-pointer" onSelect={onUnmarkReached}>
                <RotateCcw aria-hidden />
                Not reached yet
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="cursor-pointer" onSelect={onMarkReached}>
                <PartyPopper aria-hidden />
                Mark reached
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onSelect={onDelete}>
              <Trash2 className="text-destructive" aria-hidden />
              Delete goal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
        <Amount
          value={goal.total_deposited}
          currency={currency}
          className={cn("text-xl font-semibold tracking-tight", goal.total_deposited === 0 && "text-muted-foreground")}
        />
        <span className="text-[12.5px] text-muted-foreground">
          {hasTarget ? (
            <>
              of <Amount value={goal.target_amount!} currency={currency} />
            </>
          ) : (
            "saved"
          )}
        </span>
      </div>
      <GoalStatusLine progress={progress} currency={currency} todayYmd={todayYmd} className="mt-1" />

      <div className="mt-3 flex min-h-9 items-center gap-2 border-t border-border pt-2.5">
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
          {lastAddedLabel(progress, todayYmd)}
          {goal.deposit_count > 0 && (
            <>
              {" "}
              <span aria-hidden>•</span> {goal.deposit_count} {goal.deposit_count === 1 ? "deposit" : "deposits"}
            </>
          )}
        </span>
        {isReached ? (
          justReached && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="relative z-10 shrink-0 gap-1"
              onClick={onUndoReached}
              disabled={busy}
            >
              <Undo2 className="size-3.5" aria-hidden />
              Undo
            </Button>
          )
        ) : isFunded ? (
          <Button type="button" size="sm" className="relative z-10 shrink-0 gap-1" onClick={onMarkReached} disabled={busy}>
            <PartyPopper className="size-3.5" aria-hidden />
            Mark reached
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={goal.deposit_count === 0 ? "default" : "outline"}
            className="relative z-10 shrink-0 gap-1"
            onClick={onAddMoney}
            disabled={busy}
          >
            <Plus className="size-3.5" aria-hidden />
            Add money
          </Button>
        )}
      </div>
    </article>
  );
}
