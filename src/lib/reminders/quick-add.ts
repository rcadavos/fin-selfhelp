import { addDaysYmd, snoozeTargetYmd, weekdayOfYmd } from "@/lib/reminders/schedule";
import { formatYmdLocal } from "@/lib/expense-due-date";
import { REMINDER_CATEGORIES, type ToBuyCategory } from "@/lib/to-buy-storage";

export type QuickAddParse = {
  /** The text with any recognised date and #category taken out. */
  name: string;
  targetDate: string | null;
  category: ToBuyCategory | null;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const MONTH_DAY_RE = /\b(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
const IN_DAYS_RE = /\bin\s+(\d{1,2})\s+days?\b/i;
const TODAY_RE = /\b(today|tonight)\b/i;
const TOMORROW_RE = /\b(tomorrow|tmrw|tmr)\b/i;
const NEXT_WEEK_RE = /\bnext\s+week\b/i;
const WEEKEND_RE = /\b(?:this\s+)?weekend\b/i;
const WEEKDAY_RE = /\b(?:on\s+)?(mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?\b/i;
const CATEGORY_RE = /(^|\s)#([a-z]+)\b/i;

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

/** The first date phrase in `text`, as a day and the exact text it came from. */
function findDate(text: string, todayYmd: string): { ymd: string; match: string } | null {
  const md = MONTH_DAY_RE.exec(text);
  if (md) {
    const ymd = monthDayYmd(MONTHS.indexOf(md[1].toLowerCase()), Number(md[2]), todayYmd);
    if (ymd) return { ymd, match: md[0] };
  }
  const inDays = IN_DAYS_RE.exec(text);
  if (inDays) return { ymd: addDaysYmd(todayYmd, Number(inDays[1])), match: inDays[0] };
  const today = TODAY_RE.exec(text);
  if (today) return { ymd: todayYmd, match: today[0] };
  const tomorrow = TOMORROW_RE.exec(text);
  if (tomorrow) return { ymd: addDaysYmd(todayYmd, 1), match: tomorrow[0] };
  const nextWeek = NEXT_WEEK_RE.exec(text);
  if (nextWeek) return { ymd: snoozeTargetYmd("next-week", todayYmd), match: nextWeek[0] };
  const weekend = WEEKEND_RE.exec(text);
  if (weekend) return { ymd: snoozeTargetYmd("weekend", todayYmd), match: weekend[0] };
  const weekday = WEEKDAY_RE.exec(text);
  if (weekday) {
    // The coming one, counting today: "fri" typed on a Friday means today.
    const target = WEEKDAYS.indexOf(weekday[1].slice(0, 3).toLowerCase());
    const ahead = (target - weekdayOfYmd(todayYmd) + 7) % 7;
    return { ymd: addDaysYmd(todayYmd, ahead), match: weekday[0] };
  }
  return null;
}

/**
 * Reads a day ("fri", "tomorrow", "nov 30", "next week", "in 3 days") and a #category out of
 * quick-add text. Dates are only read when `allowDates` is set, because target dates are a Pro
 * feature; on the free plan "fri" stays part of the name rather than being silently dropped.
 */
export function parseReminderQuickAdd(
  text: string,
  { todayYmd, allowDates }: { todayYmd: string; allowDates: boolean }
): QuickAddParse {
  let rest = text;
  let category: ToBuyCategory | null = null;
  let targetDate: string | null = null;

  const tag = CATEGORY_RE.exec(rest);
  if (tag) {
    category = categoryFromTag(tag[2]);
    if (category) rest = rest.replace(tag[0], " ");
  }

  if (allowDates) {
    const found = findDate(rest, todayYmd);
    if (found) {
      targetDate = found.ymd;
      rest = rest.replace(found.match, " ");
    }
  }

  const name = rest.replace(/\s+/g, " ").trim();
  // Text that was nothing but a date or a tag stays as typed, so the reminder still has a name.
  return { name: name || text.trim(), targetDate, category };
}
