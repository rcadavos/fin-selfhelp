-- Run this in Supabase Dashboard → SQL Editor → New query
-- Creates profiles and expense_entries tables + RLS + trigger

-- 1. Tables
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  net_take_home numeric not null default 0,
  currency text not null default 'PHP',
  is_subscriber boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  category_id text not null,
  amount numeric not null default 0,
  note text,
  due_date date,
  reminder_days_before smallint[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expense_entries add column if not exists due_date date;
alter table public.expense_entries add column if not exists reminder_days_before smallint[];
alter table public.profiles add column if not exists is_subscriber boolean not null default false;

-- 2. Unique constraint
create unique index if not exists profiles_user_id_key on public.profiles (user_id);

-- 3. updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists expense_entries_updated_at on public.expense_entries;
create trigger expense_entries_updated_at
  before update on public.expense_entries
  for each row execute function public.set_updated_at();

-- 4. RLS
alter table public.profiles enable row level security;
alter table public.expense_entries enable row level security;

-- Drop existing policies if re-running (optional)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own expense entries" on public.expense_entries;
drop policy if exists "Users can insert own expense entries" on public.expense_entries;
drop policy if exists "Users can update own expense entries" on public.expense_entries;
drop policy if exists "Users can delete own expense entries" on public.expense_entries;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can view own expense entries"
  on public.expense_entries for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Users can insert own expense entries"
  on public.expense_entries for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Users can update own expense entries"
  on public.expense_entries for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Users can delete own expense entries"
  on public.expense_entries for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

-- 5. Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, net_take_home, currency)
  values (new.id, 0, 'PHP');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
