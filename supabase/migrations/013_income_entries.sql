-- Income entries: rows for net take-home by category (Salary, Business, Gift, etc.).
create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_key text not null default 'salary',
  amount numeric not null default 0,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists income_entries_profile_id_idx on public.income_entries(profile_id);

comment on table public.income_entries is 'Income rows for net take-home; category_key e.g. salary, business, gift.';

alter table public.income_entries enable row level security;

create policy "Users can view own income entries"
  on public.income_entries for select
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "Users can insert own income entries"
  on public.income_entries for insert
  to authenticated
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "Users can update own income entries"
  on public.income_entries for update
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "Users can delete own income entries"
  on public.income_entries for delete
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create trigger income_entries_updated_at
  before update on public.income_entries
  for each row
  execute function public.set_updated_at();
