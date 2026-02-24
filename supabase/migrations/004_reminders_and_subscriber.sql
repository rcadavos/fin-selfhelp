-- Reminder schedule per expense: 3 days, 1 day, and/or on due date (subscriber-only feature)
alter table public.expense_entries
  add column if not exists reminder_days_before smallint[] default null;
comment on column public.expense_entries.reminder_days_before is 'Days before due date to send reminder; e.g. {3,1,0} = 3 days, 1 day, and on due date. Subscriber feature.';

-- Subscriber flag: when true, user can set reminders and access premium features
alter table public.profiles
  add column if not exists is_subscriber boolean not null default false;
