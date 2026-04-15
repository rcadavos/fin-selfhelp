-- Expense entry enhancements:
-- 1) Optional long-form notes
-- 2) Billing period support (monthly / yearly)
-- 3) Optional yearly due month

alter table public.expense_entries
  add column if not exists notes text,
  add column if not exists billing_period text not null default 'monthly',
  add column if not exists due_month smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expense_entries_billing_period_check'
  ) then
    alter table public.expense_entries
      add constraint expense_entries_billing_period_check
      check (billing_period in ('monthly', 'yearly'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expense_entries_due_month_check'
  ) then
    alter table public.expense_entries
      add constraint expense_entries_due_month_check
      check (due_month is null or (due_month between 1 and 12));
  end if;
end
$$;

comment on column public.expense_entries.notes is
  'Optional long-form notes for an expense entry.';
comment on column public.expense_entries.billing_period is
  'Recurrence cadence for an expense entry: monthly or yearly.';
comment on column public.expense_entries.due_month is
  'For yearly expenses, the due month (1-12).';
