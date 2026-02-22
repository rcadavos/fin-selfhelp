-- Profiles: net take-home per user (optional auth later)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  net_take_home numeric not null default 0,
  currency text not null default 'PHP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Expense entries by category (can be linked to profile when user is logged in)
create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  category_id text not null,
  amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS (enable when using Supabase Auth)
-- alter table public.profiles enable row level security;
-- alter table public.expense_entries enable row level security;

-- Optional: trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger expense_entries_updated_at
  before update on public.expense_entries
  for each row execute function public.set_updated_at();
