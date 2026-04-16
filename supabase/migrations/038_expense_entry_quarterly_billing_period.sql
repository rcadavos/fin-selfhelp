-- Allow quarterly recurrence in expense billing periods.

alter table public.expense_entries
  drop constraint if exists expense_entries_billing_period_check;

alter table public.expense_entries
  add constraint expense_entries_billing_period_check
  check (billing_period in ('monthly', 'quarterly', 'yearly'));

comment on column public.expense_entries.billing_period is
  'Recurrence cadence for an expense entry: monthly, quarterly, or yearly.';
