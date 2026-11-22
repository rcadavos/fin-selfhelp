"use client";

import { useMemo, type ReactNode } from "react";
import { AlarmClock, Check, Trash2 } from "lucide-react";
import type { ReminderDraft } from "@/hooks/use-reminders";
import { REMINDER_SECTION_LABELS, REMINDER_WEEK_LENGTH } from "@/lib/constants/reminders";
import {
  buildFocusSections,
  dayOfMonth,
  dueLabel,
  isOverdue,
  longDateLabel,
  reminderCategoryLabel,
  weekdayShortLabel,
  type ReminderGroups,
  type ReminderSection,
  type ReminderWeekDay,
} from "@/lib/reminders/schedule";
import { formatTimeLabel, formatTimeUntil, minutesOfHhmm } from "@/lib/reminders/time";
import { REMINDER_CATEGORIES, type ToBuyCategory, type ToBuyItem } from "@/lib/to-buy-storage";
import { cn } from "@/lib/utils";
import {
  ReminderCategoryTile,
  ReminderCheckButton,
  ReminderLockedRow,
  ReminderMeta,
  repeatShortLabel,
} from "./reminder-parts";
import { ReminderQuickAdd } from "./reminder-quick-add";

const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ done, total }: { done: number; total: number }) {
  const filled = total > 0 ? (RING_CIRCUMFERENCE * done) / total : 0;
  return (
    <div className="relative size-[52px] shrink-0">
      <svg viewBox="0 0 52 52" className="size-full -rotate-90" role="img" aria-label={`${done} of ${total} done`}>
        <circle cx="26" cy="26" r={RING_RADIUS} fill="none" strokeWidth="5" className="stroke-panel-foreground/15" />
        <circle
          cx="26"
          cy="26"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${RING_CIRCUMFERENCE}`}
          className="stroke-panel-accent transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span aria-hidden className="absolute inset-0 flex items-center justify-center font-mono text-[12px]">
        {done}/{total}
      </span>
    </div>
  );
}

function WeekStrip({
  week,
  selectedYmd,
  locale,
  onSelect,
}: {
  week: ReminderWeekDay[];
  selectedYmd: string;
  locale: string;
  onSelect: (ymd: string) => void;
}) {
  return (
    <div role="group" aria-label="Pick a day" className="mt-4 grid grid-cols-7 gap-1">
      {week.map((d) => {
        const on = d.ymd === selectedYmd;
        return (
          <button
            key={d.ymd}
            type="button"
            aria-pressed={on}
            aria-label={`${longDateLabel(d.ymd, locale)}, ${d.openCount} open`}
            onClick={() => onSelect(d.ymd)}
            className={cn(
              "flex h-[60px] flex-col items-center justify-center gap-1 rounded-xl transition-colors",
              on ? "bg-panel-accent text-panel" : "hover:bg-panel-foreground/10"
            )}
          >
            <span className={cn("text-[10.5px] font-semibold uppercase tracking-[0.06em]", !on && "text-panel-muted")}>
              {weekdayShortLabel(d.ymd, locale)}
            </span>
            <span className="font-mono text-base leading-none">{dayOfMonth(d.ymd)}</span>
            <span aria-hidden className="flex h-1 gap-0.5">
              {Array.from({ length: Math.min(d.openCount, 3) }, (_, i) => (
                <span key={i} className={cn("size-1 rounded-full", on ? "bg-panel" : "bg-panel-accent")} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Phone layout: a dark panel for the chosen day (progress, what is next, a week strip),
 * then category chips and the day's reminders as cards. Today is the home view and also
 * lists overdue and undated reminders.
 */
export function ReminderFocusView({
  todayYmd,
  nowMinutes,
  locale,
  groups,
  week,
  selectedYmd,
  onSelectDay,
  category,
  onCategory,
  lockedIds,
  hasPro,
  usedCount,
  onAdd,
  onToggle,
  onOpen,
  onDelete,
  onClearDone,
}: {
  todayYmd: string;
  nowMinutes: number;
  locale: string;
  groups: ReminderGroups;
  week: ReminderWeekDay[];
  selectedYmd: string;
  onSelectDay: (ymd: string) => void;
  category: ToBuyCategory | "all";
  onCategory: (category: ToBuyCategory | "all") => void;
  lockedIds: Set<string>;
  hasPro: boolean;
  usedCount: number;
  onAdd: (draft: ReminderDraft) => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  /** Deletes one done reminder without asking. */
  onDelete: (id: string) => void;
  /** Asks, then deletes every reminder in "Done earlier". */
  onClearDone: (ids: string[]) => void;
}) {
  const isTodayView = selectedYmd === todayYmd;
  const sections = useMemo(
    () => buildFocusSections(groups, todayYmd, selectedYmd, REMINDER_WEEK_LENGTH, locale),
    [groups, todayYmd, selectedYmd, locale]
  );

  const dayItems = sections.filter((s) => s.countsTowardDay).flatMap((s) => s.items).filter((it) => !lockedIds.has(it.id));
  const done = dayItems.filter((it) => it.checked).length;
  const next = dayItems.find((it) => !it.checked) ?? null;
  const nextOverdue = next ? isOverdue(next, todayYmd) : false;

  const allItems = sections.flatMap((s) => s.items);
  const chips = [
    { value: "all" as const, label: "All", count: allItems.filter((it) => !it.checked).length },
    ...REMINDER_CATEGORIES.filter((c) => allItems.some((it) => it.category === c.value)).map((c) => ({
      value: c.value,
      label: c.label,
      count: allItems.filter((it) => !it.checked && it.category === c.value).length,
    })),
  ];
  const activeCategory = chips.some((c) => c.value === category) ? category : "all";
  const visibleSections: ReminderSection[] = sections
    .map((s) => ({ ...s, items: activeCategory === "all" ? s.items : s.items.filter((it) => it.category === activeCategory) }))
    .filter((s) => s.items.length > 0);

  const heading = isTodayView ? REMINDER_SECTION_LABELS.today : sections[0]?.label ?? "";

  // "in 1h 20m" for a reminder later today, "Since 3:00 PM" once its time has gone by.
  const nextAt = next ? minutesOfHhmm(next.targetTime) : null;
  const nextWhen = !next
    ? ""
    : nextOverdue
      ? REMINDER_SECTION_LABELS.overdue
      : !next.targetDate
        ? REMINDER_SECTION_LABELS.anytime
        : next.targetDate === todayYmd && nextAt !== null
          ? nextAt > nowMinutes
            ? formatTimeUntil(nextAt - nowMinutes)
            : `Since ${formatTimeLabel(next.targetTime)}`
          : dueLabel(next.targetDate, todayYmd, locale);
  const nextMeta = next
    ? [
        reminderCategoryLabel(next.category),
        nextOverdue ? dueLabel(next.targetDate, todayYmd, locale) : null,
        next.targetTime ? formatTimeLabel(next.targetTime) : null,
        repeatShortLabel(next),
      ]
        .filter(Boolean)
        .join(" • ")
    : "";

  return (
    <div className="space-y-4">
      <section aria-label="Your day" className="rounded-[1.375rem] bg-panel p-4 text-panel-foreground">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-panel-muted">{longDateLabel(selectedYmd, locale)}</p>
            <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-tight">{heading}</h1>
          </div>
          <ProgressRing done={done} total={dayItems.length} />
        </div>

        {next ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-panel-foreground/[0.08] py-3 pl-3.5 pr-2">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.11em]",
                  nextOverdue ? "text-[hsl(39.1_66.7%_60%)]" : "text-panel-accent"
                )}
              >
                Next up • {nextWhen}
              </p>
              <p className="mt-1 truncate text-base font-semibold">{next.name}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-panel-muted">{nextMeta}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpen(next.id)}
              aria-label={`Snooze or edit ${next.name}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-panel-foreground/10 transition-colors hover:bg-panel-foreground/15"
            >
              <AlarmClock className="size-[18px]" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onToggle(next.id)}
              className="h-11 shrink-0 rounded-xl bg-panel-accent px-4 text-sm font-semibold text-panel transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-panel-foreground/[0.08] px-3.5 py-4 text-[15px] font-medium">
            <Check className="size-[18px] text-panel-accent" strokeWidth={2.5} aria-hidden />
            {dayItems.length > 0 ? "All clear. Everything here is done." : "Nothing due. Add one below."}
          </div>
        )}

        <WeekStrip week={week} selectedYmd={selectedYmd} locale={locale} onSelect={onSelectDay} />
      </section>

      <ReminderQuickAdd
        todayYmd={todayYmd}
        nowMinutes={nowMinutes}
        locale={locale}
        hasPro={hasPro}
        usedCount={usedCount}
        defaultDate={isTodayView ? null : selectedYmd}
        onAdd={onAdd}
      />

      {chips.length > 2 ? (
        <div role="group" aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {chips.map((c) => {
            const on = c.value === activeCategory;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={on}
                onClick={() => onCategory(c.value)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors",
                  on
                    ? "bg-foreground font-semibold text-background"
                    : "border border-hairline-strong bg-card font-medium text-muted-foreground"
                )}
              >
                {c.label}
                <span className={cn("font-mono", on ? "opacity-80" : "")}>{c.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {visibleSections.length === 0 ? (
        <p className="surface border border-dashed border-hairline-strong px-4 py-8 text-center text-sm text-muted-foreground">
          {isTodayView ? "No reminders yet. Add your first one above." : `Nothing on ${longDateLabel(selectedYmd, locale)}.`}
        </p>
      ) : (
        visibleSections.map((section) => (
          <FocusSection
            key={section.key}
            section={section}
            showHeading={isTodayView}
            todayYmd={todayYmd}
            nowMinutes={nowMinutes}
            locale={locale}
            lockedIds={lockedIds}
            onToggle={onToggle}
            onOpen={onOpen}
            onDelete={onDelete}
            onClearDone={onClearDone}
          />
        ))
      )}
    </div>
  );
}

function FocusSection({
  section,
  showHeading,
  todayYmd,
  nowMinutes,
  locale,
  lockedIds,
  onToggle,
  onOpen,
  onDelete,
  onClearDone,
}: {
  section: ReminderSection;
  showHeading: boolean;
  todayYmd: string;
  nowMinutes: number;
  locale: string;
  lockedIds: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onClearDone: (ids: string[]) => void;
}) {
  const open = section.items.filter((it) => !it.checked);
  const done = section.items.filter((it) => it.checked);
  // Single-day sections already say the day, so the cards only need it elsewhere.
  const showDue = section.key === "overdue" || section.key === "later" || section.key === "doneEarlier";
  const tone = section.key === "overdue" ? "warning" : "default";

  return (
    <section aria-label={section.label} className="space-y-2">
      {showHeading ? (
        <h2
          className={cn(
            "flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
            tone === "warning" ? "text-warning" : "text-muted-foreground"
          )}
        >
          <span>
            {section.label} • {section.items.length}
          </span>
          {section.key === "doneEarlier" ? (
            <button
              type="button"
              onClick={() => onClearDone(section.items.map((it) => it.id))}
              className="tap-target normal-case tracking-normal text-[12px] font-medium text-destructive"
            >
              Clear all
            </button>
          ) : null}
        </h2>
      ) : null}

      {open.length > 0 ? (
        <ul className="space-y-2">
          {open.map((item) =>
            lockedIds.has(item.id) ? (
              <li key={item.id} className="surface border border-border bg-card">
                <ReminderLockedRow name={item.name} />
              </li>
            ) : (
              <FocusCard
                key={item.id}
                item={item}
                meta={
                  <ReminderMeta
                    item={item}
                    todayYmd={todayYmd}
                    nowMinutes={nowMinutes}
                    locale={locale}
                    showDue={showDue}
                    warning={tone === "warning"}
                  />
                }
                tone={tone}
                onToggle={onToggle}
                onOpen={onOpen}
              />
            )
          )}
        </ul>
      ) : null}

      {done.length > 0 ? (
        <ul className={cn(open.length > 0 && "pt-1")}>
          {done.map((item) =>
            lockedIds.has(item.id) ? (
              <li key={item.id} className="border-b border-border">
                <ReminderLockedRow name={item.name} />
              </li>
            ) : (
              <li key={item.id} className="flex min-h-12 items-center gap-1 border-b border-border pl-1">
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="min-w-0 flex-1 truncate py-2 text-left text-sm text-muted-foreground line-through"
                >
                  {item.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => onDelete(item.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
                <div className="flex size-11 shrink-0 items-center justify-center">
                  <ReminderCheckButton checked name={item.name} onClick={() => onToggle(item.id)} />
                </div>
              </li>
            )
          )}
        </ul>
      ) : null}
    </section>
  );
}

function FocusCard({
  item,
  meta,
  tone,
  onToggle,
  onOpen,
}: {
  item: ToBuyItem;
  meta: ReactNode;
  tone: "default" | "warning";
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <li className="surface flex items-center gap-1 border border-border bg-card py-2 pl-2.5 pr-1">
      <button type="button" onClick={() => onOpen(item.id)} className="flex min-w-0 flex-1 items-center gap-3 py-0.5 text-left">
        <ReminderCategoryTile
          category={item.category}
          className={tone === "warning" ? "bg-warning/10 text-warning" : undefined}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-snug">{item.name}</span>
          <span className="mt-0.5 block truncate">{meta}</span>
        </span>
      </button>
      <div className="flex size-11 shrink-0 items-center justify-center">
        <ReminderCheckButton
          checked={false}
          name={item.name}
          tone={tone}
          onClick={() => onToggle(item.id)}
          className="size-6"
        />
      </div>
    </li>
  );
}
