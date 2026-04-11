-- Monthly "paid" tracking per expense entry (replaces client localStorage)

create table if not exists public.expense_payments (
  id uuid primary key default gen_random_uuid(),
  expense_entry_id uuid not null references public.expense_entries(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  paid_month text not null,
  paid_at timestamptz not null default now(),
  constraint expense_payments_paid_month_format check (paid_month ~ '^\d{4}-\d{2}$')
);

create unique index if not exists expense_payments_entry_month
  on public.expense_payments (expense_entry_id, paid_month);

create index if not exists expense_payments_profile_month
  on public.expense_payments (profile_id, paid_month);

alter table public.expense_payments enable row level security;

create policy "Users can view own expense payments"
  on public.expense_payments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Users can insert own expense payments"
  on public.expense_payments for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Users can delete own expense payments"
  on public.expense_payments for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );
