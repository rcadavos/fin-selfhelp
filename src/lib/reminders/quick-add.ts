import { addDaysYmd, snoozeTargetYmd, weekdayOfYmd } from "@/lib/reminders/schedule";
import { hhmmFromMinutes, minutesOfHhmm } from "@/lib/reminders/time";
import { formatYmdLocal } from "@/lib/expense-due-date";
import { REMINDER_CATEGORIES, type ReminderRepeat, type ToBuyCategory } from "@/lib/to-buy-storage";

export type QuickAddParse = {
  /** The text with any recognised date, time, repeat and #category taken out. */
  name: string;
  targetDate: string | null;
  /** `HH:MM`, 24-hour. */
  targetTime: string | null;
  repeat: ReminderRepeat | null;
  category: ToBuyCategory | null;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY = "mon(?:day)?|tues?(?:day)?|wed(?:nes)?(?:day)?|thu(?:rs?)?(?:day)?|fri(?:day)?|sat(?:ur)?(?:day)?|sun(?:day)?";

const MONTH_DAY_RE = /\b(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
const IN_DAYS_RE = /\bin\s+(\d{1,2})\s+days?\b/i;
const TODAY_RE = /\b(today|tonight)\b/i;
const TOMORROW_RE = /\b(tomorrow|tmrw|tmr)\b/i;
const NEXT_WEEK_RE = /\bnext\s+week\b/i;
const WEEKEND_RE = /\b(?:this\s+)?weekend\b/i;
const WEEKDAY_RE = new RegExp(`\\b(?:on\\s+)?(${WEEKDAY})\\b`, "i");
const EVERY_RE = new RegExp(`\\bevery\\s+(day|week|month|year|${WEEKDAY})\\b`, "i");
const REPEAT_WORD_RE = /\b(daily|weekly|monthly|yearly|annually)\b/i;
const TIME_12H_RE = /\b(?:at\s+)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s?(am|pm)\b/i;
const TIME_24H_RE = /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i;
const NOON_RE = /\b(?:at\s+)?noon\b/i;
const CATEGORY_RE = /(^|\s)#([a-z]+)\b/i;

/** "tonight" with no time given. */
const TONIGHT_DEFAULT = "20:00";

function categoryFromTag(tag: string): ToBuyCategory | null {
  const t = tag.toLowerCase();
  const match = REMINDER_CATEGORIES.find(
    (c) => c.value === t || c.label.toLowerCase().split(" ")[0] === t
  );
  return match?.value ?? null;
}

function monthDayYmd(monthIdx: number, day: number, todayYmd: string): string | null {
  const year = Number(todayYmd.slice(0, 4));
  for (const y of [year, year + 1]) {
    const d = new Date(y, monthIdx, day);
    if (d.getMonth() !== monthIdx) return null;
    const ymd = formatYmdLocal(d);
    if (ymd >= todayYmd) return ymd;
  }
  return null;
}

/** The coming `weekday` (e.g. "fri"), counting today: "fri" typed on a Friday means today. */
function comingWeekdayYmd(weekday: string, todayYmd: string): string {
  const target = WEEKDAYS.indexOf(weekday.slice(0, 3).toLowerCase());
  return addDaysYmd(todayYmd, (target - weekdayOfYmd(todayYmd) + 7) % 7);
}

/** The first date phrase in `text`, as a day and the exact text it came from. */
function findDate(text: string, todayYmd: string): { ymd: string; match: string; tonight?: boolean } | null {
  const md = MONTH_DAY_RE.exec(text);
  if (md) {
    const ymd = monthDayYmd(MONTHS.indexOf(md[1].toLowerCase()), Number(md[2]), todayYmd);
    if (ymd) return { ymd, match: md[0] };
  }
  const inDays = IN_DAYS_RE.exec(text);
  if (inDays) return { ymd: addDaysYmd(todayYmd, Number(inDays[1])), match: inDays[0] };
  const today = TODAY_RE.exec(text);
  if (today) return { ymd: todayYmd, match: today[0], tonight: today[1].toLowerCase() === "tonight" };
  const tomorrow = TOMORROW_RE.exec(text);
  if (tomorrow) return { ymd: addDaysYmd(todayYmd, 1), match: tomorrow[0] };
  const nextWeek = NEXT_WEEK_RE.exec(text);
  if (nextWeek) return { ymd: snoozeTargetYmd("next-week", todayYmd), match: nextWeek[0] };
  const weekend = WEEKEND_RE.exec(text);
  if (weekend) return { ymd: snoozeTargetYmd("weekend", todayYmd), match: weekend[0] };
  const weekday = WEEKDAY_RE.exec(text);
  if (weekday) return { ymd: comingWeekdayYmd(weekday[1], todayYmd), match: weekday[0] };
  return null;
}

function findTime(text: string): { hhmm: string; match: string } | null {
  const t12 = TIME_12H_RE.exec(text);
  if (t12) {
    const h = (Number(t12[1]) % 12) + (t12[3].toLowerCase() === "pm" ? 12 : 0);
    return { hhmm: hhmmFromMinutes(h * 60 + Number(t12[2] ?? 0)), match: t12[0] };
  }
  const t24 = TIME_24H_RE.exec(text);
  if (t24) return { hhmm: hhmmFromMinutes(Number(t24[1]) * 60 + Number(t24[2])), match: t24[0] };
  const noon = NOON_RE.exec(text);
  if (noon) return { hhmm: "12:00", match: noon[0] };
  return null;
}

function findRepeat(text: string, todayYmd: string): { repeat: ReminderRepeat; match: string; ymd?: string } | null {
  const every = EVERY_RE.exec(text);
  if (every) {
    const unit = every[1].toLowerCase();
    if (unit === "day") return { repeat: "daily", match: every[0] };
    if (unit === "week") return { repeat: "weekly", match: every[0] };
    if (unit === "month") return { repeat: "monthly", match: every[0] };
    if (unit === "year") return { repeat: "yearly", match: every[0] };
    return { repeat: "weekly", match: every[0], ymd: comingWeekdayYmd(unit, todayYmd) };
  }
  const word = REPEAT_WORD_RE.exec(text);
  if (word) {
    const w = word[1].toLowerCase();
    const repeat: ReminderRepeat = w === "annually" ? "yearly" : (w as ReminderRepeat);
    return { repeat, match: word[0] };
  }
  return null;
}

/**
 * Reads a day ("fri", "tomorrow", "nov 30", "next week"), a time ("3pm", "14:30", "noon"),
 * a repeat ("every friday", "monthly") and a #category out of quick-add text.
 *
 * Dates, times and repeats are only read when `allowDates` is set, because they are a Pro
 * feature; on the free plan "fri 3pm" stays part of the name rather than being dropped.
 * A time with no day means today, or tomorrow once that time has passed.
 */
export function parseReminderQuickAdd(
  text: string,
  { todayYmd, nowMinutes, allowDates }: { todayYmd: string; nowMinutes: number; allowDates: boolean }
): QuickAddParse {
  let rest = text;
  let category: ToBuyCategory | null = null;
  let targetDate: string | null = null;
  let targetTime: string | null = null;
  let repeat: ReminderRepeat | null = null;

  const tag = CATEGORY_RE.exec(rest);
  if (tag) {
    category = categoryFromTag(tag[2]);
    if (category) rest = rest.replace(tag[0], " ");
  }

  if (allowDates) {
    const rep = findRepeat(rest, todayYmd);
    if (rep) {
      repeat = rep.repeat;
      targetDate = rep.ymd ?? null;
      rest = rest.replace(rep.match, " ");
    }

    let tonight = false;
    if (!targetDate) {
      const found = findDate(rest, todayYmd);
      if (found) {
        targetDate = found.ymd;
        tonight = !!found.tonight;
        rest = rest.replace(found.match, " ");
      }
    }

    const time = findTime(rest);
    if (time) {
      targetTime = time.hhmm;
      rest = rest.replace(time.match, " ");
    } else if (tonight) {
      targetTime = TONIGHT_DEFAULT;
    }

    // A time or a repeat needs a day to hang on.
    if (!targetDate && (targetTime || repeat)) {
      const passed = targetTime !== null && (minutesOfHhmm(targetTime) ?? 0) <= nowMinutes;
      targetDate = passed ? addDaysYmd(todayYmd, 1) : todayYmd;
    }
  }

  const name = rest.replace(/\s+/g, " ").trim();
  // Text that was nothing but a date or a tag stays as typed, so the reminder still has a name.
  return { name: name || text.trim(), targetDate, targetTime, repeat, category };
}
