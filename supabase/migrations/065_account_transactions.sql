-- Account transactions: per-account ledger entries (expense, income, adjustment, transfer).
-- These power the per-account balance shown on /dashboard/accounts/[accountId] and are
-- INTENTIONALLY independent from expense_entries / bills which only "tag" an account.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. account_transactions table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.account_transactions (
  id                  uuid          primary key default gen_random_uuid(),
  profile_id          uuid          not null references public.profiles(id) on delete cascade,
  account_id          uuid          not null references public.accounts(id) on delete cascade,
  type                text          not null check (type in ('expense', 'income', 'adjustment', 'transfer')),
  -- Signed amount: positive = inflow, negative = outflow.
  amount              numeric(14,2) not null,
  description         text          not null default '',
  -- For transfers, both rows share a transfer_group_id so they can be loaded/deleted as a pair.
  transfer_group_id   uuid          null,
  occurred_at         timestamptz   not null default now(),
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now()
);

create index if not exists account_transactions_account_id_idx
  on public.account_transactions (account_id, occurred_at desc);

create index if not exists account_transactions_profile_id_idx
  on public.account_transactions (profile_id);

create index if not exists account_transactions_transfer_group_id_idx
  on public.account_transactions (transfer_group_id)
  where transfer_group_id is not null;

create trigger account_transactions_updated_at
  before update on public.account_transactions
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.account_transactions enable row level security;

create policy "Users can view own account transactions"
  on public.account_transactions for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can insert own account transactions"
  on public.account_transactions for insert
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can update own account transactions"
  on public.account_transactions for update
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can delete own account transactions"
  on public.account_transactions for delete
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );
