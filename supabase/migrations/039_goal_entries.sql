-- Personal goals (Goals) per profile

create table if not exists public.goal_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  date_set date not null,
  date_achieved_month smallint,
  date_achieved_year smallint,
  goal_type text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goal_entries_goal_type_check check (goal_type in ('short_term', 'long_term', 'lifetime')),
  constraint goal_entries_achieved_month_check check (
    date_achieved_month is null or (date_achieved_month >= 1 and date_achieved_month <= 12)
  ),
  constraint goal_entries_achieved_year_check check (
    date_achieved_year is null or (date_achieved_year >= 1900 and date_achieved_year <= 2100)
  ),
  constraint goal_entries_achieved_both_or_neither check (
    (date_achieved_month is null and date_achieved_year is null)
    or (date_achieved_month is not null and date_achieved_year is not null)
  )
);

create index if not exists goal_entries_profile_created_idx
  on public.goal_entries (profile_id, created_at desc);

comment on table public.goal_entries is 'User goals with optional month/year achieved date.';

drop trigger if exists goal_entries_updated_at on public.goal_entries;
create trigger goal_entries_updated_at
  before update on public.goal_entries
  for each row execute function public.set_updated_at();

alter table public.goal_entries enable row level security;

create policy "goal_entries_select_owner"
  on public.goal_entries for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "goal_entries_insert_owner"
  on public.goal_entries for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "goal_entries_update_owner"
  on public.goal_entries for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "goal_entries_delete_owner"
  on public.goal_entries for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );
