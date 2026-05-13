-- Drop legacy columns on expense_entries that were superseded by the bills
-- (Planned Expenses) feature. Recurring/due-date/reminder logic now lives on
-- the public.bills table exclusively; expense_entries are pure one-off rows
-- with a category, amount, and creation date.
--
-- Migration 050 already moved any row with due_date set off to bills, and
-- subsequent app code stopped reading these columns (see the code cleanup
-- shipped alongside this migration). This migration drops the columns to
-- keep the schema honest.
--
-- Safety: nothing in production currently writes to these columns; the app
-- removed all SELECT/INSERT/UPDATE references in the same release.

alter table public.expense_entries
  drop column if exists due_date,
  drop column if exists due_month,
  drop column if exists billing_period,
  drop column if exists reminder_days_before,
  drop column if exists reminder_channel;
