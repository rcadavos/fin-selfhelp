alter table public.expense_entries
  add column if not exists notes text;

comment on column public.expense_entries.notes is 'Optional long-form notes for an expense entry.';
