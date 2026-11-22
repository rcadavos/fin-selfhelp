"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Clock, Hash, Plus, Repeat, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReminderDraft } from "@/hooks/use-reminders";
import {
  REMINDER_DEFAULT_CATEGORY,
  REMINDER_QUICK_ADD_PLACEHOLDER,
  REMINDER_QUICK_ADD_TIP,
  REMINDER_UPGRADE_HREF,
} from "@/lib/constants/reminders";
import { parseReminderQuickAdd } from "@/lib/reminders/quick-add";
import { repeatLabel } from "@/lib/reminders/repeat";
import { formatTimeLabel } from "@/lib/reminders/time";
import { reminderCategoryLabel, shortDateLabel } from "@/lib/reminders/schedule";
import { FREE_TIER_MAX_LIST_ITEMS } from "@/lib/subscription-tier";
import { cn } from "@/lib/utils";

function ParsedChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12.5px] font-medium text-accent-foreground">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

/**
 * One line to add a reminder. It reads a day and a #category out of what you type and
 * shows what it understood as chips before you press Enter.
 */
export function ReminderQuickAdd({
  todayYmd,
  nowMinutes,
  locale,
  hasPro,
  usedCount,
  defaultDate,
  onAdd,
  className,
}: {
  todayYmd: string;
  /** Minutes since local midnight; decides whether "3pm" means today or tomorrow. */
  nowMinutes: number;
  locale: string;
  hasPro: boolean;
  /** Reminders saved so far; only shown on the free plan. */
  usedCount: number;
  /** Date a reminder gets when the text names none (the day being viewed). Pro only. */
  defaultDate?: string | null;
  onAdd: (draft: ReminderDraft) => void;
  className?: string;
}) {
  const inputId = useId();
  const [text, setText] = useState("");
  const parsed = useMemo(
    () => parseReminderQuickAdd(text, { todayYmd, nowMinutes, allowDates: hasPro }),
    [text, todayYmd, nowMinutes, hasPro]
  );
  const atLimit = !hasPro && usedCount >= FREE_TIER_MAX_LIST_ITEMS;
  const targetDate = parsed.targetDate ?? (hasPro ? defaultDate ?? null : null);
  const category = parsed.category ?? REMINDER_DEFAULT_CATEGORY;
  const typing = text.trim().length > 0;
  const understoodSomething = !!parsed.targetDate || !!parsed.targetTime || !!parsed.repeat || !!parsed.category;

  function submit() {
    if (!typing || atLimit) return;
    onAdd({ name: parsed.name, category, targetDate, targetTime: parsed.targetTime, repeat: parsed.repeat });
    setText("");
  }

  if (atLimit) {
    return (
      <div className={cn("surface border border-dashed border-hairline-strong px-4 py-3 text-sm", className)}>
        <p className="font-medium">You have {FREE_TIER_MAX_LIST_ITEMS} reminders, the most the free plan holds.</p>
        <p className="mt-0.5 text-muted-foreground">
          Finish or delete one to add another, or{" "}
          <Link href={REMINDER_UPGRADE_HREF} className="font-medium text-primary underline-offset-4 hover:underline">
            get Pro
          </Link>{" "}
          for unlimited reminders.
        </p>
      </div>
    );
  }

  return (
    <form
      className={cn("space-y-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="surface flex min-h-[3.25rem] items-center gap-3 border border-hairline-strong bg-card pl-3.5 pr-1.5 transition-colors focus-within:border-primary">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </span>
        <label htmlFor={inputId} className="sr-only">
          Add a reminder
        </label>
        <Input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={hasPro ? REMINDER_QUICK_ADD_PLACEHOLDER.pro : REMINDER_QUICK_ADD_PLACEHOLDER.free}
          autoComplete="off"
          enterKeyHint="done"
          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 text-base shadow-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[15px]"
        />
        {typing ? (
          <Button type="submit" size="sm" className="shrink-0">
            Add
          </Button>
        ) : null}
      </div>

      {typing ? (
        <div className="flex flex-wrap items-center gap-1.5 px-1" aria-live="polite">
          {targetDate ? <ParsedChip icon={CalendarDays}>{shortDateLabel(targetDate, locale)}</ParsedChip> : null}
          {parsed.targetTime ? <ParsedChip icon={Clock}>{formatTimeLabel(parsed.targetTime)}</ParsedChip> : null}
          {parsed.repeat && targetDate ? (
            <ParsedChip icon={Repeat}>{repeatLabel(parsed.repeat, targetDate, locale)}</ParsedChip>
          ) : null}
          <ParsedChip icon={Hash}>{reminderCategoryLabel(category)}</ParsedChip>
          <span className="text-[12.5px] text-muted-foreground">
            {understoodSomething
              ? `Saves as “${parsed.name}”`
              : hasPro
                ? REMINDER_QUICK_ADD_TIP.pro
                : REMINDER_QUICK_ADD_TIP.free}
          </span>
        </div>
      ) : !hasPro ? (
        <p className="px-1 text-[11.5px] text-muted-foreground">
          Free plan • {usedCount} of {FREE_TIER_MAX_LIST_ITEMS} reminders •{" "}
          <Link href={REMINDER_UPGRADE_HREF} className="font-medium text-primary underline-offset-4 hover:underline">
            Pro adds dates, times, repeats and unlimited reminders
          </Link>
        </p>
      ) : null}
    </form>
  );
}
