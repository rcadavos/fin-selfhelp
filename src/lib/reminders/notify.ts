import { formatTimeLabel, minutesOfHhmm } from "@/lib/reminders/time";

/** The columns the reminder senders read from `to_do_items`. */
export type ToDoReminderRow = {
  id: string;
  name: string;
  target_date: string | null;
  target_time: string | null;
};

export const TODO_REMINDER_SELECT = "id, name, target_date, target_time";

export const TODO_NOTIFICATION_KIND = "todo_target_date";

/**
 * One notification per reminder per day, and per time: changing a reminder's time
 * lets it notify again at the new time instead of being swallowed as a duplicate.
 */
export function todoReminderDedupeKey(row: ToDoReminderRow, ymd: string): string {
  const time = row.target_time?.slice(0, 5);
  return time ? `todo:${row.id}:${ymd}:t-${time.replace(":", "")}` : `todo:${row.id}:${ymd}`;
}

export function todoReminderMessage(row: ToDoReminderRow): { title: string; body: string } {
  const time = formatTimeLabel(row.target_time?.slice(0, 5));
  return {
    title: `Reminder: ${row.name}`,
    body: time ? `Due today at ${time}.` : "Due today.",
  };
}

/**
 * Whether a reminder due today should notify by `nowHhmm`. One without a time goes out
 * with the morning release; one with a time goes out once its time has come.
 */
export function isTodoReminderDue(row: ToDoReminderRow, nowHhmm: string, morningReleased: boolean): boolean {
  const at = minutesOfHhmm(row.target_time);
  if (at === null) return morningReleased;
  const now = minutesOfHhmm(nowHhmm);
  return now !== null && at <= now;
}
