-- Accounts: named bank/e-wallet accounts for labelling expenses and bills.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. accounts table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.accounts (
  id            uuid        primary key default gen_random_uuid(),
  profile_id    uuid        not null references public.profiles(id) on delete cascade,
  account_alias text        not null,
  bank_name     text        not null,
  tags          text[]      not null default '{}',
  color         text        not null default '#6366f1',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Link expense_entries and bills to an account (optional)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.expense_entries
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table public.bills
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.accounts enable row level security;

create policy "Users can view own accounts"
  on public.accounts for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can insert own accounts"
  on public.accounts for insert
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can update own accounts"
  on public.accounts for update
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can delete own accounts"
  on public.accounts for delete
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );
