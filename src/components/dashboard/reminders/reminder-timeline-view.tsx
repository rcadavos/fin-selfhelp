"use client";

import { useState, type ReactNode } from "react";
import { AlarmClock, Bell, CalendarOff, ChevronDown, Lock, Repeat, Trash2 } from "lucide-react";
import { ContentHeader } from "@/components/app/content-header";
import { Button } from "@/components/ui/button";
import type { ReminderDraft } from "@/hooks/use-reminders";
import {
  REMINDER_DONE_EARLIER_PREVIEW,
  REMINDER_SECTION_LABELS,
  type ReminderSnoozeOption,
} from "@/lib/constants/reminders";
import {
  dayHeading,
  dayOfMonth,
  longDateLabel,
  reminderCategoryLabel,
  weekdayShortLabel,
  type ReminderGroups,
  type ReminderWeekDay,
} from "@/lib/reminders/schedule";
import { formatTimeLabel } from "@/lib/reminders/time";
import type { ToBuyItem } from "@/lib/to-buy-storage";
import { cn } from "@/lib/utils";
import {
  ReminderCheckButton,
  ReminderLockedRow,
  ReminderMeta,
  isLateToday,
  repeatShortLabel,
} from "./reminder-parts";
import { ReminderQuickAdd } from "./reminder-quick-add";

type RowHandlers = {
  selectedId: string | null;
  lockedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

type RowContext = RowHandlers & { todayYmd: string; nowMinutes: number };

function TimelineRow({
  item,
  selectedId,
  lockedIds,
  todayYmd,
  nowMinutes,
  onToggle,
  onSelect,
  onDelete,
}: { item: ToBuyItem } & RowContext) {
  if (lockedIds.has(item.id)) {
    return (
      <li className="border-t border-border">
        <ReminderLockedRow name={item.name} />
      </li>
    );
  }
  const selected = item.id === selectedId;
  const repeat = repeatShortLabel(item);
  return (
    <li
      className={cn(
        "group -mx-2.5 flex min-h-14 items-center gap-3 rounded-lg border-t border-border px-2.5 transition-colors",
        selected ? "border-transparent bg-accent" : "hover:bg-muted/50"
      )}
    >
      <ReminderCheckButton checked={item.checked} name={item.name} onClick={() => onToggle(item.id)} />
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 self-stretch text-left"
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[15px]",
            item.checked ? "text-muted-foreground line-through" : "font-medium"
          )}
        >
          {item.name}
        </span>
        {repeat ? (
          <span title={`Repeats ${repeat.toLowerCase()}`} className="shrink-0 text-muted-foreground">
            <Repeat className="size-3.5" aria-hidden />
            <span className="sr-only">Repeats {repeat.toLowerCase()}</span>
          </span>
        ) : null}
        <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
          {reminderCategoryLabel(item.category)}
        </span>
        <span
          className={cn(
            "w-[4.75rem] shrink-0 text-right font-mono text-[12.5px]",
            isLateToday(item, todayYmd, nowMinutes) ? "text-warning" : "text-muted-foreground"
          )}
        >
          {formatTimeLabel(item.targetTime)}
        </span>
      </button>
      {item.checked ? (
        <button
          type="button"
          aria-label={`Delete ${item.name}`}
          onClick={() => onDelete(item.id)}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

function TimelineGroup({
  marker,
  heading,
  meta,
  items,
  ...handlers
}: { marker: ReactNode; heading: string; meta: string; items: ToBuyItem[] } & RowContext) {
  return (
    <div className="flex gap-4 pt-4 first:pt-3">
      <div className="flex w-12 shrink-0 flex-col items-center pt-0.5">{marker}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 py-2">
          <h3 className="text-base font-semibold">{heading}</h3>
          <span className="text-[12.5px] text-muted-foreground">{meta}</span>
        </div>
        <ul>
          {items.map((item) => (
            <TimelineRow key={item.id} item={item} {...handlers} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function DateMarker({ ymd, isToday, locale }: { ymd: string; isToday: boolean; locale: string }) {
  return (
    <>
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full font-mono",
          isToday ? "bg-primary text-lg text-primary-foreground" : "text-xl"
        )}
      >
        {dayOfMonth(ymd)}
      </span>
      <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {weekdayShortLabel(ymd, locale)}
      </span>
    </>
  );
}

function leftLabel(items: ToBuyItem[]): string {
  const left = items.filter((it) => !it.checked).length;
  return left === 0 ? "All done" : `${left} left`;
}

/**
 * Desktop layout: every reminder on one timeline, grouped by day with a date column,
 * overdue ones pulled out above it, and the selected reminder's details on the right.
 */
export function ReminderTimelineView({
  todayYmd,
  nowMinutes,
  locale,
  groups,
  week,
  hasPro,
  usedCount,
  onAdd,
  onSnooze,
  onClearDone,
  detail,
  ...rowHandlers
}: {
  todayYmd: string;
  nowMinutes: number;
  locale: string;
  groups: ReminderGroups;
  week: ReminderWeekDay[];
  hasPro: boolean;
  usedCount: number;
  onAdd: (draft: ReminderDraft) => void;
  onSnooze: (id: string, option: ReminderSnoozeOption) => void;
  onClearDone: (ids: string[]) => void;
  /** The selected reminder's details, shown in the side column from `lg` up. */
  detail: ReactNode;
} & RowHandlers) {
  const [showDone, setShowDone] = useState(false);
  const [showAllDone, setShowAllDone] = useState(false);
  const handlers: RowContext = { ...rowHandlers, todayYmd, nowMinutes };

  const openCount =
    groups.overdue.length +
    groups.days.reduce((n, g) => n + g.items.filter((it) => !it.checked).length, 0) +
    groups.anytime.filter((it) => !it.checked).length;
  const subtitle = [
    longDateLabel(todayYmd, locale),
    `${openCount} open`,
    ...(groups.overdue.length > 0 ? [`${groups.overdue.length} overdue`] : []),
  ].join(" • ");

  const isEmpty = groups.days.length === 0 && groups.anytime.length === 0;
  const doneShown = showAllDone ? groups.doneEarlier : groups.doneEarlier.slice(0, REMINDER_DONE_EARLIER_PREVIEW);

  return (
    <div>
      <ContentHeader title="Reminders" subtitle={subtitle} icon={Bell} />
      <ReminderQuickAdd
        todayYmd={todayYmd}
        nowMinutes={nowMinutes}
        locale={locale}
        hasPro={hasPro}
        usedCount={usedCount}
        onAdd={onAdd}
      />

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          {groups.overdue.length > 0 ? (
            <section aria-labelledby="reminders-overdue" className="surface border border-warning/30 bg-warning/[0.07] px-4 py-3">
              <h2
                id="reminders-overdue"
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-warning"
              >
                <AlarmClock className="size-3.5" aria-hidden />
                {REMINDER_SECTION_LABELS.overdue} • {groups.overdue.length}
              </h2>
              <ul className="mt-1 divide-y divide-warning/20">
                {groups.overdue.map((item) =>
                  handlers.lockedIds.has(item.id) ? (
                    <li key={item.id}>
                      <ReminderLockedRow name={item.name} />
                    </li>
                  ) : (
                    <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                      <button type="button" onClick={() => handlers.onSelect(item.id)} className="min-w-[12rem] flex-1 text-left">
                        <span className="block font-semibold">{item.name}</span>
                        <ReminderMeta
                          item={item}
                          todayYmd={todayYmd}
                          nowMinutes={nowMinutes}
                          locale={locale}
                          showDue
                          warning
                          className="block text-[13px]"
                        />
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 border-warning/40 bg-card"
                        onClick={() => onSnooze(item.id, "tomorrow")}
                      >
                        {hasPro ? null : <Lock className="size-3.5" aria-hidden />}
                        Snooze to tomorrow
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 bg-warning text-warning-foreground hover:bg-warning/90"
                        onClick={() => handlers.onToggle(item.id)}
                      >
                        Mark done
                      </Button>
                    </li>
                  )
                )}
              </ul>
            </section>
          ) : null}

          <section aria-label="Timeline" className="surface border border-border bg-card px-5 pb-3">
            {isEmpty ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {groups.overdue.length > 0 || groups.doneEarlier.length > 0
                  ? "Nothing coming up."
                  : "No reminders yet. Add your first one above."}
              </p>
            ) : null}

            {groups.days.map((g) => (
              <TimelineGroup
                key={g.ymd}
                marker={<DateMarker ymd={g.ymd} isToday={g.ymd === todayYmd} locale={locale} />}
                heading={dayHeading(g.ymd, todayYmd, locale)}
                meta={leftLabel(g.items)}
                items={g.items}
                {...handlers}
              />
            ))}

            {groups.anytime.length > 0 ? (
              <TimelineGroup
                marker={
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <CalendarOff className="size-4" aria-hidden />
                  </span>
                }
                heading={REMINDER_SECTION_LABELS.anytime}
                meta={`No date • ${leftLabel(groups.anytime)}`}
                items={groups.anytime}
                {...handlers}
              />
            ) : null}

            {groups.doneEarlier.length > 0 ? (
              <div className="ml-16 mt-3 border-t border-border">
                <div className="flex min-h-12 items-center justify-between gap-3">
                  <button
                    type="button"
                    aria-expanded={showDone}
                    onClick={() => setShowDone((v) => !v)}
                    className="flex flex-1 items-center gap-2 py-2 text-left text-sm text-muted-foreground"
                  >
                    {REMINDER_SECTION_LABELS.doneEarlier} • {groups.doneEarlier.length}
                    <ChevronDown className={cn("size-4 transition-transform", showDone && "rotate-180")} aria-hidden />
                  </button>
                  {showDone ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onClearDone(groups.doneEarlier.map((it) => it.id))}
                    >
                      Clear all
                    </Button>
                  ) : null}
                </div>
                {showDone ? (
                  <>
                    <ul>
                      {doneShown.map((item) => (
                        <TimelineRow key={item.id} item={item} {...handlers} />
                      ))}
                    </ul>
                    {!showAllDone && groups.doneEarlier.length > doneShown.length ? (
                      <Button variant="link" size="sm" className="px-0" onClick={() => setShowAllDone(true)}>
                        Show all {groups.doneEarlier.length}
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <aside aria-label="Reminder details" className="hidden space-y-4 lg:block">
          <section className="surface border border-border bg-card p-5">{detail}</section>
          <section aria-labelledby="reminders-week" className="surface border border-border bg-card p-4">
            <h2
              id="reminders-week"
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            >
              Next 7 days
            </h2>
            <ol className="grid grid-cols-7 gap-1">
              {week.map((d) => (
                <li
                  key={d.ymd}
                  aria-label={`${longDateLabel(d.ymd, locale)}, ${d.openCount} open`}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg py-2",
                    d.isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  <span className={cn("text-[11px] font-semibold", !d.isToday && "text-muted-foreground")}>
                    {weekdayShortLabel(d.ymd, locale)}
                  </span>
                  <span className="font-mono text-[15px]">{dayOfMonth(d.ymd)}</span>
                  <span className={cn("font-mono text-[11px]", !d.isToday && (d.openCount ? "text-primary" : "text-muted-foreground"))}>
                    {d.openCount}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
