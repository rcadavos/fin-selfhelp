"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/ui/amount-input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormPanel } from "@/components/app/form-panel";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { NotesField } from "@/components/app/notes-field";
import { cn } from "@/lib/utils";
import type { createGoal, GoalEntryRow, GoalType } from "@/actions/goals";
import { DEFAULT_GOAL_TYPE, GOAL_MIN_YEAR, GOAL_TYPES } from "@/lib/constants/goals";
import { GOAL_MONTH_NAMES } from "@/lib/goals/progress";

export type GoalInput = Parameters<typeof createGoal>[0];

export type GoalFormState = {
  name: string;
  goal_type: GoalType;
  /** Raw digits from the amount field; empty for no target. */
  target_amount: string;
  set_month: string;
  set_year: string;
  reached: boolean;
  reached_month: string;
  reached_year: string;
  notes: string;
};

export function emptyGoalForm(now = new Date()): GoalFormState {
  const month = String(now.getMonth() + 1);
  const year = String(now.getFullYear());
  return {
    name: "",
    goal_type: DEFAULT_GOAL_TYPE,
    target_amount: "",
    set_month: month,
    set_year: year,
    reached: false,
    reached_month: month,
    reached_year: year,
    notes: "",
  };
}

export function goalToForm(goal: GoalEntryRow, now = new Date()): GoalFormState {
  const reached = goal.date_achieved_month != null && goal.date_achieved_year != null;
  return {
    name: goal.name,
    goal_type: goal.goal_type,
    target_amount: goal.target_amount != null ? String(goal.target_amount) : "",
    set_month: String(goal.date_set_month),
    set_year: String(goal.date_set_year),
    reached,
    reached_month: String(reached ? goal.date_achieved_month : now.getMonth() + 1),
    reached_year: String(reached ? goal.date_achieved_year : now.getFullYear()),
    notes: goal.notes ?? "",
  };
}

export function formToGoalInput(form: GoalFormState): GoalInput {
  const target = Number(form.target_amount.trim());
  return {
    name: form.name.trim(),
    goal_type: form.goal_type,
    target_amount: form.target_amount.trim() && Number.isFinite(target) && target > 0 ? target : null,
    date_set_month: Number(form.set_month),
    date_set_year: Number(form.set_year),
    date_achieved_month: form.reached ? Number(form.reached_month) : null,
    date_achieved_year: form.reached ? Number(form.reached_year) : null,
    notes: form.notes.trim() ? form.notes.trim() : null,
  };
}

/** A goal as it is sent to the server, for saving it back with only the reached date changed. */
export function goalRowToInput(goal: GoalEntryRow): GoalInput {
  return {
    name: goal.name,
    goal_type: goal.goal_type,
    target_amount: goal.target_amount,
    date_set_month: goal.date_set_month,
    date_set_year: goal.date_set_year,
    date_achieved_month: goal.date_achieved_month,
    date_achieved_year: goal.date_achieved_year,
    notes: goal.notes?.trim() ? goal.notes.trim() : null,
  };
}

/** Why the form can't be saved yet, or null when it can. */
function validate(form: GoalFormState, now: Date): string | null {
  if (!form.name.trim()) return null; // The disabled button says enough.
  const nowIndex = now.getFullYear() * 12 + now.getMonth() + 1;
  const setIndex = Number(form.set_year) * 12 + Number(form.set_month);
  if (setIndex > nowIndex) return "The month you set it hasn't happened yet.";
  if (form.reached) {
    const reachedIndex = Number(form.reached_year) * 12 + Number(form.reached_month);
    if (reachedIndex > nowIndex) return "The month you reached it hasn't happened yet.";
    if (reachedIndex < setIndex) return "It can't be reached before the month it was set.";
  }
  return null;
}

function MonthYearPicker({
  idPrefix,
  label,
  month,
  year,
  years,
  onMonthChange,
  onYearChange,
}: {
  idPrefix: string;
  label: string;
  month: string;
  year: string;
  years: number[];
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[3fr_2fr] gap-2">
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger id={`${idPrefix}-month`} className="h-9 w-full" aria-label={`${label}, month`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[100]">
          {GOAL_MONTH_NAMES.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger id={`${idPrefix}-year`} className="h-9 w-full" aria-label={`${label}, year`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[100]">
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const CHIP_BASE =
  "surface flex flex-col items-start gap-0.5 border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const CHIP_ON = "border-primary bg-primary/10";
const CHIP_OFF = "border-border hover:border-primary/40";

/**
 * Add or edit a goal. The horizon is three tap-to-pick choices with a plain-words
 * hint each, and "reached" is a switch that reveals its month and year, rather
 * than two dropdowns that had to be set together or left together.
 *
 * The form reads `initial` once, when it mounts. Give it a new `key` each time it
 * opens so it starts from the goal as it is now.
 */
export function GoalFormPanel({
  open,
  mode,
  initial,
  isPending,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "add" | "edit";
  initial: GoalFormState;
  isPending: boolean;
  /** A save error from the server, shown above the buttons. */
  error: string | null;
  onClose: () => void;
  onSave: (form: GoalFormState) => void;
}) {
  const [form, setForm] = useState<GoalFormState>(initial);
  const [now] = useState(() => new Date());
  const [years] = useState(() => {
    const out: number[] = [];
    for (let y = now.getFullYear(); y >= GOAL_MIN_YEAR; y--) out.push(y);
    return out;
  });

  function set<K extends keyof GoalFormState>(key: K, value: GoalFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const problem = validate(form, now);
  const canSave = !!form.name.trim() && !problem && !isPending;
  const shownError = problem ?? error;

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogHeader className="flex-shrink-0 px-6 pb-2 pt-6">
        <DialogTitle>{mode === "edit" ? "Edit goal" : "Add a goal"}</DialogTitle>
        <DialogDescription>
          {mode === "edit"
            ? "Money already added stays with the goal."
            : "Name what you're saving for, then add money to it as you go."}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) onSave(form);
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <ScrollFadeBody className="space-y-5 px-6 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="goal-name">
              Goal <span className="text-destructive">*</span>
            </Label>
            <Input
              id="goal-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Emergency fund, Japan trip, New laptop"
              autoFocus={mode === "add"}
              required
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium leading-none">When do you want it?</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {GOAL_TYPES.map((t) => {
                const active = form.goal_type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("goal_type", t.value)}
                    className={cn(CHIP_BASE, active ? CHIP_ON : CHIP_OFF)}
                  >
                    <span className={cn("text-[13px] font-medium", active ? "text-primary" : "text-foreground")}>
                      {t.label}
                    </span>
                    <span className="text-[11px] leading-tight text-muted-foreground">{t.hint}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-1.5">
            <Label htmlFor="goal-target">
              Target amount <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <AmountInput
              id="goal-target"
              value={form.target_amount}
              onChange={(v) => set("target_amount", v)}
              placeholder="e.g. 50,000"
            />
            <p className="text-xs text-muted-foreground">
              With a target you see how close you are and when you&rsquo;ll get there.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium leading-none">Set in</legend>
            <MonthYearPicker
              idPrefix="goal-set"
              label="Set in"
              month={form.set_month}
              year={form.set_year}
              years={years}
              onMonthChange={(v) => set("set_month", v)}
              onYearChange={(v) => set("set_year", v)}
            />
          </fieldset>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label id="goal-reached-label" htmlFor="goal-reached" className="mb-0 cursor-pointer">
                I&rsquo;ve reached this goal
              </Label>
              <ToggleSwitch
                id="goal-reached"
                aria-labelledby="goal-reached-label"
                checked={form.reached}
                onCheckedChange={(v) => set("reached", v)}
              />
            </div>
            {form.reached && (
              <MonthYearPicker
                idPrefix="goal-reached"
                label="Reached in"
                month={form.reached_month}
                year={form.reached_year}
                years={years}
                onMonthChange={(v) => set("reached_month", v)}
                onYearChange={(v) => set("reached_year", v)}
              />
            )}
          </div>

          <NotesField
            id="goal-notes"
            value={form.notes}
            onChange={(v) => set("notes", v)}
            placeholder="Why it matters, or how you'll get there"
          />
        </ScrollFadeBody>

        {shownError && (
          <p role="alert" className="mx-6 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {shownError}
          </p>
        )}

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3 [&_button]:h-11">
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSave}>
              {isPending ? "Saving…" : mode === "edit" ? "Save changes" : "Add goal"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </FormPanel>
  );
}
