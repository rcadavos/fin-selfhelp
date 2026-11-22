"use client";

import { useCallback, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ProFeatureDialog } from "@/components/app/pro-feature-dialog";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReminders } from "@/hooks/use-reminders";
import { useLocalClock } from "@/hooks/use-local-clock";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import {
  REMINDER_PRO_DIALOG,
  REMINDER_WEEK_LENGTH,
  type ReminderSnoozeOption,
} from "@/lib/constants/reminders";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import {
  buildReminderWeek,
  groupReminders,
  reminderLocale,
  shortDateLabel,
  snoozeTargetYmd,
} from "@/lib/reminders/schedule";
import { FREE_TIER_MAX_LIST_ITEMS } from "@/lib/subscription-tier";
import type { ReminderRepeat, ToBuyCategory, ToBuyItem } from "@/lib/to-buy-storage";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import { ReminderDetails } from "./reminder-details";
import { ReminderFocusView } from "./reminder-focus-view";
import { ReminderTimelineView } from "./reminder-timeline-view";

/**
 * The Reminders page. Phones get the Today Focus layout; from `md` up it is the
 * Timeline with a details column. Both read the same list and share every action.
 */
export function RemindersBoard() {
  const clock = useLocalClock();
  // "Today" and "now" depend on the viewer's timezone, which the server doesn't know.
  if (!clock) return <DashboardSkeleton variant="page" />;
  return <RemindersBoardContent todayYmd={clock.todayYmd} nowMinutes={clock.nowMinutes} />;
}

function RemindersBoardContent({ todayYmd, nowMinutes }: { todayYmd: string; nowMinutes: number }) {
  const { items, add, update, toggle: toggleItem, remove } = useReminders();
  const { showSuccess } = useSnackbar();
  const { data: capabilities } = useSuspenseQuery(subscriptionCapabilitiesQueryOptions());
  const hasPro = Boolean(capabilities?.hasProLevelAccess);
  const prefs = useUserPreferencesOptional()?.preferences ?? DEFAULT_USER_PREFERENCES;
  const locale = reminderLocale(prefs.language);
  // Below this the details column is hidden, so choosing a reminder opens the sheet instead.
  const hasDetailsColumn = useMediaQuery("(min-width: 1024px)");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [focusCategory, setFocusCategory] = useState<ToBuyCategory | "all">("all");
  // The ids stay set after closing so the dialog's title doesn't change while it fades out.
  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  const groups = useMemo(() => groupReminders(items, todayYmd), [items, todayYmd]);
  const week = useMemo(() => buildReminderWeek(groups, todayYmd, REMINDER_WEEK_LENGTH), [groups, todayYmd]);
  // The free plan keeps the first reminders usable and locks the rest, matching the server's limit.
  const lockedIds = useMemo(
    () => new Set(hasPro ? [] : items.slice(FREE_TIER_MAX_LIST_ITEMS).map((it) => it.id)),
    [items, hasPro]
  );

  const selectedDay = focusDay && week.some((d) => d.ymd === focusDay) ? focusDay : todayYmd;

  // Desktop details: the chosen reminder, else the first open one in timeline order.
  const panelItem = useMemo(() => {
    const usable = (it: ToBuyItem) => !lockedIds.has(it.id);
    const chosen = items.find((it) => it.id === selectedId && usable(it));
    if (chosen) return chosen;
    const order = [...groups.overdue, ...groups.days.flatMap((g) => g.items), ...groups.anytime];
    return order.find((it) => !it.checked && usable(it)) ?? null;
  }, [items, selectedId, lockedIds, groups]);
  const sheetItem = sheetId ? items.find((it) => it.id === sheetId) ?? null : null;

  const requirePro = useCallback(() => setProOpen(true), []);

  /** Ticking off a repeating reminder moves it on rather than finishing it, so say where it went. */
  const toggle = useCallback(
    (id: string) => {
      const next = toggleItem(id, todayYmd);
      if (next) showSuccess(`Done. The next one is ${shortDateLabel(next, locale)}.`);
    },
    [toggleItem, todayYmd, showSuccess, locale]
  );

  // Snoozing moves this occurrence only; the repeat keeps counting from its anchor.
  const snooze = useCallback(
    (id: string, option: ReminderSnoozeOption) => {
      if (!hasPro) return requirePro();
      update(id, { targetDate: snoozeTargetYmd(option, todayYmd) });
    },
    [hasPro, requirePro, update, todayYmd]
  );

  // Picking a date by hand re-bases a repeat on it; clearing the date drops its time and repeat.
  const setDate = useCallback(
    (id: string, ymd: string | null) => {
      if (!hasPro) return requirePro();
      const item = items.find((it) => it.id === id);
      if (!ymd) update(id, { targetDate: null, targetTime: null, repeat: null, repeatAnchor: null });
      else update(id, { targetDate: ymd, repeatAnchor: item?.repeat ? ymd : null });
    },
    [hasPro, requirePro, update, items]
  );

  // A time or a repeat needs a day; an undated reminder gets today.
  const setTime = useCallback(
    (id: string, hhmm: string | null) => {
      if (!hasPro) return requirePro();
      const item = items.find((it) => it.id === id);
      update(id, { targetTime: hhmm, ...(hhmm && !item?.targetDate ? { targetDate: todayYmd } : {}) });
    },
    [hasPro, requirePro, update, items, todayYmd]
  );

  const setRepeat = useCallback(
    (id: string, repeat: ReminderRepeat | null) => {
      if (!hasPro) return requirePro();
      const item = items.find((it) => it.id === id);
      if (!repeat) return update(id, { repeat: null, repeatAnchor: null });
      const date = item?.targetDate || todayYmd;
      update(id, { repeat, targetDate: date, repeatAnchor: date });
    },
    [hasPro, requirePro, update, items, todayYmd]
  );

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!hasDetailsColumn) setSheetId(id);
    },
    [hasDetailsColumn]
  );

  const deleteNow = useCallback((id: string) => remove([id]), [remove]);

  const askToDelete = useCallback((ids: string[]) => {
    setConfirmIds(ids);
    setConfirmOpen(true);
  }, []);

  function confirmDelete() {
    remove(confirmIds);
    if (selectedId && confirmIds.includes(selectedId)) setSelectedId(null);
  }

  function renderDetails(item: ToBuyItem, inSheet: boolean) {
    const closeSheet = () => {
      if (inSheet) setSheetId(null);
    };
    return (
      <ReminderDetails
        key={item.id}
        item={item}
        todayYmd={todayYmd}
        locale={locale}
        hasPro={hasPro}
        onRename={(name) => update(item.id, { name })}
        onCategory={(category) => update(item.id, { category })}
        onSetDate={(ymd) => setDate(item.id, ymd)}
        onSetTime={(hhmm) => setTime(item.id, hhmm)}
        onSetRepeat={(repeat) => setRepeat(item.id, repeat)}
        onSnooze={(option) => {
          snooze(item.id, option);
          if (hasPro) closeSheet();
        }}
        onToggle={() => {
          toggle(item.id);
          closeSheet();
        }}
        onDelete={() => {
          closeSheet();
          askToDelete([item.id]);
        }}
        onRequirePro={requirePro}
      />
    );
  }

  const deleteCount = confirmIds.length;

  return (
    <div className="container mx-auto max-w-lg px-4 py-4 md:max-w-6xl md:px-6 md:py-6">
      <div className="md:hidden">
        <ReminderFocusView
          todayYmd={todayYmd}
          nowMinutes={nowMinutes}
          locale={locale}
          groups={groups}
          week={week}
          selectedYmd={selectedDay}
          onSelectDay={setFocusDay}
          category={focusCategory}
          onCategory={setFocusCategory}
          lockedIds={lockedIds}
          hasPro={hasPro}
          usedCount={items.length}
          onAdd={add}
          onToggle={toggle}
          onOpen={setSheetId}
          onDelete={deleteNow}
          onClearDone={askToDelete}
        />
      </div>

      <div className="hidden md:block">
        <ReminderTimelineView
          todayYmd={todayYmd}
          nowMinutes={nowMinutes}
          locale={locale}
          groups={groups}
          week={week}
          hasPro={hasPro}
          usedCount={items.length}
          selectedId={panelItem?.id ?? null}
          lockedIds={lockedIds}
          onAdd={add}
          onToggle={toggle}
          onSelect={select}
          onSnooze={snooze}
          onDelete={deleteNow}
          onClearDone={askToDelete}
          detail={
            panelItem ? (
              renderDetails(panelItem, false)
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Pick a reminder to see and change its details.
              </p>
            )
          }
        />
      </div>

      <Sheet open={!!sheetItem} onOpenChange={(open) => !open && setSheetId(null)}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] overflow-y-auto rounded-t-[1.75rem] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7"
        >
          <SheetTitle className="sr-only">{sheetItem?.name ?? "Reminder"}</SheetTitle>
          <SheetDescription className="sr-only">Change, snooze, finish or delete this reminder.</SheetDescription>
          {sheetItem ? <div className="mx-auto max-w-lg">{renderDetails(sheetItem, true)}</div> : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={deleteCount === 1 ? "Delete this reminder?" : `Delete ${deleteCount} reminders?`}
        description="This can't be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />

      <ProFeatureDialog
        open={proOpen}
        onOpenChange={setProOpen}
        feature={REMINDER_PRO_DIALOG.feature}
        description={REMINDER_PRO_DIALOG.description}
      />
    </div>
  );
}
