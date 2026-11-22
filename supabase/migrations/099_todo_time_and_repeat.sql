-- Reminders get a time of day and an optional repeat.
--
-- target_time   local time of day the reminder is due; null means "any time that day",
--               which notifies at the 8 AM release like before.
-- repeat_rule   how often it comes back once checked off; null means it does not repeat.
-- repeat_anchor the date the repeat is counted from. Kept apart from target_date so that
--               snoozing one occurrence does not move every later one, and so a reminder
--               on the 31st comes back on the 31st after a shorter month.

alter table public.to_do_items
  add column if not exists target_time time,
  add column if not exists repeat_rule text,
  add column if not exists repeat_anchor date;

alter table public.to_do_items
  drop constraint if exists to_do_items_repeat_rule_check;

alter table public.to_do_items
  add constraint to_do_items_repeat_rule_check
  check (repeat_rule is null or repeat_rule in ('daily', 'weekly', 'monthly', 'yearly'));

-- The timed-reminders cron looks up open reminders due today at or before now.
create index if not exists to_do_items_due_time_idx
  on public.to_do_items (target_date, target_time)
  where checked = false and target_time is not null;
