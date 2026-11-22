"use client";

import { useEffect, useId, useState } from "react";
import { AlarmClock, CalendarDays, Check, Lock, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  REMINDER_ALERT_TIME_LABEL,
  REMINDER_SNOOZE_OPTIONS,
  type ReminderSnoozeOption,
} from "@/lib/constants/reminders";
import { formatYmdLocal } from "@/lib/expense-due-date";
import {
  daysBetweenYmd,
  dueLabel,
  isOverdue,
  longDateLabel,
  shortDateLabel,
  snoozeTargetYmd,
  ymdToDate,
} from "@/lib/reminders/schedule";
import { REMINDER_CATEGORIES, type ToBuyCategory, type ToBuyItem } from "@/lib/to-buy-storage";
import { cn } from "@/lib/utils";

function statusLabel(item: ToBuyItem, todayYmd: string, locale: string): string {
  if (item.checked) return "Done";
  if (!item.targetDate) return "No date";
  if (isOverdue(item, todayYmd)) return `Overdue • ${dueLabel(item.targetDate, todayYmd, locale)}`;
  const diff = daysBetweenYmd(todayYmd, item.targetDate);
  return diff <= 1 ? `Due ${dueLabel(item.targetDate, todayYmd, locale).toLowerCase()}` : `Due ${dueLabel(item.targetDate, todayYmd, locale)}`;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{children}</p>
  );
}

/**
 * Everything you can do to one reminder: rename it, recategorise it, date or snooze it,
 * finish it or delete it. Used in the desktop side panel and in the phone's bottom sheet.
 */
export function ReminderDetails({
  item,
  todayYmd,
  locale,
  hasPro,
  onRename,
  onCategory,
  onSetDate,
  onSnooze,
  onToggle,
  onDelete,
  onRequirePro,
}: {
  item: ToBuyItem;
  todayYmd: string;
  locale: string;
  hasPro: boolean;
  onRename: (name: string) => void;
  onCategory: (category: ToBuyCategory) => void;
  onSetDate: (ymd: string | null) => void;
  onSnooze: (option: ReminderSnoozeOption) => void;
  onToggle: () => void;
  onDelete: () => void;
  onRequirePro: () => void;
}) {
  const nameId = useId();
  const [name, setName] = useState(item.name);
  const [dateOpen, setDateOpen] = useState(false);
  useEffect(() => setName(item.name), [item.id, item.name]);

  const overdue = isOverdue(item, todayYmd);
  const selectedDate = item.targetDate ? ymdToDate(item.targetDate) ?? undefined : undefined;

  function commitName() {
    const t = name.trim();
    if (!t) {
      setName(item.name);
      return;
    }
    if (t !== item.name) onRename(t);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.08em]",
            overdue ? "text-warning" : item.checked ? "text-primary" : "text-muted-foreground"
          )}
        >
          {statusLabel(item, todayYmd, locale)}
        </p>
        <label htmlFor={nameId} className="sr-only">
          Reminder
        </label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={cn(
            "mt-1 h-auto border-0 bg-transparent px-0 py-0.5 text-[22px] font-semibold tracking-tight shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
            item.checked && "text-muted-foreground line-through"
          )}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2">
          <SectionLabel>Category</SectionLabel>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {REMINDER_CATEGORIES.map((cat) => {
            const on = item.category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                aria-pressed={on}
                onClick={() => onCategory(cat.value)}
                className={cn(
                  "h-9 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  on
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-hairline-strong hover:text-foreground"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2">
          <SectionLabel>Date</SectionLabel>
        </legend>
        {hasPro ? (
          <div className="flex items-center gap-2">
            <Popover modal={false} open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 flex-1 justify-start gap-2 px-3 text-sm">
                  <CalendarDays className="size-4 text-primary" aria-hidden />
                  {item.targetDate ? longDateLabel(item.targetDate, locale) : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[100] w-auto border-0 bg-transparent p-0 shadow-none" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  defaultMonth={selectedDate ?? new Date()}
                  onSelect={(d) => {
                    if (!d) return;
                    onSetDate(formatYmdLocal(d));
                    setDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            {item.targetDate ? (
              <Button variant="ghost" className="h-11 px-3 text-sm" onClick={() => onSetDate(null)}>
                Clear
              </Button>
            ) : null}
          </div>
        ) : (
          <Button variant="outline" className="h-11 w-full justify-start gap-2 px-3 text-sm" onClick={onRequirePro}>
            <Lock className="size-4 text-primary" aria-hidden />
            Add a date • Pro
          </Button>
        )}
        <p className="mt-2 text-[12px] text-muted-foreground">
          A reminder with a date notifies you at {REMINDER_ALERT_TIME_LABEL} that day.
        </p>
      </fieldset>

      {!item.checked ? (
        <fieldset>
          <legend className="mb-2">
            <SectionLabel>Snooze to</SectionLabel>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {REMINDER_SNOOZE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => (hasPro ? onSnooze(opt.id) : onRequirePro())}
                className="flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent"
              >
                <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                  {hasPro ? (
                    <AlarmClock className="size-3.5 text-primary" aria-hidden />
                  ) : (
                    <Lock className="size-3.5 text-primary" aria-hidden />
                  )}
                  {opt.label}
                </span>
                <span className="font-mono text-[11.5px] text-muted-foreground">
                  {shortDateLabel(snoozeTargetYmd(opt.id, todayYmd), locale)}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="flex gap-2 border-t border-border pt-4">
        <Button className="h-11 flex-1 gap-2 text-sm" onClick={onToggle}>
          {item.checked ? <RotateCcw className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
          {item.checked ? "Mark as not done" : "Mark done"}
        </Button>
        <Button variant="destructive" className="h-11 gap-2 px-4 text-sm" onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden />
          Delete
        </Button>
      </div>
    </div>
  );
}
