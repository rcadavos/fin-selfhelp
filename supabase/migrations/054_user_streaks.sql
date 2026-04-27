alter table public.profiles
  add column if not exists streak_count    int  not null default 1,
  add column if not exists last_active_date date;
