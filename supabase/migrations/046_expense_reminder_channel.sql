-- Add reminder_channel to expense_entries.
-- Possible values: 'email', 'in-app', 'both'. Default is 'both'.
alter table public.expense_entries
  add column if not exists reminder_channel text not null default 'both';

comment on column public.expense_entries.reminder_channel is 'Reminder delivery preference: email, in-app, or both.';
