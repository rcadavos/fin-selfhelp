-- Birth-month Pro perk: one free month of Pro per year, during the user's own
-- birth month. Two pieces here — a ledger so the grant can only fire once per
-- user per year, and a trigger making birth_month write-once.
--
-- Why write-once: the perk is keyed on a value the user chooses themselves, so
-- an editable birth month is an unlimited Pro generator — set it to the current
-- month, collect, change it next month, collect again. The app blocks the edit
-- too, but the trigger is what actually guarantees it: profiles.birth_month is
-- also written from auth metadata sync, so an app-only check has more than one
-- way round it.

create table if not exists public.birthday_pro_grants (
  id          uuid        primary key default gen_random_uuid(),
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  -- Calendar year the grant was made for, so the perk repeats annually.
  grant_year  int         not null,
  birth_month smallint    not null check (birth_month between 1 and 12),
  granted_at  timestamptz not null default now()
);

-- The idempotency guarantee: one grant per user per year. The cron relies on
-- the insert failing rather than on having read cleanly first, so a retry or an
-- overlapping run cannot double-grant.
create unique index if not exists birthday_pro_grants_year_key
  on public.birthday_pro_grants (profile_id, grant_year);

create index if not exists birthday_pro_grants_profile_idx
  on public.birthday_pro_grants (profile_id);

comment on table public.birthday_pro_grants is
  'One row per user per year the birth-month Pro month was granted. The unique '
  '(profile_id, grant_year) index is what stops the cron granting twice.';

alter table public.birthday_pro_grants enable row level security;

-- Read-only to the owner; only the service role (the cron) ever writes.
drop policy if exists "birthday_pro_grants_select_own" on public.birthday_pro_grants;
create policy "birthday_pro_grants_select_own"
  on public.birthday_pro_grants for select
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- ── birth_month is write-once ──────────────────────────────────────────────
create or replace function public.enforce_birth_month_write_once()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Null -> value is the one allowed transition. Value -> anything else is not,
  -- including value -> null, which would otherwise clear the way for a reset.
  if old.birth_month is not null and new.birth_month is distinct from old.birth_month then
    raise exception 'birth_month is already set and cannot be changed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_birth_month_write_once on public.profiles;
create trigger profiles_birth_month_write_once
  before update of birth_month on public.profiles
  for each row
  execute function public.enforce_birth_month_write_once();

comment on function public.enforce_birth_month_write_once() is
  'Blocks any change to profiles.birth_month once it holds a value. The perk is '
  'keyed on it, so an editable birth month would be an unlimited Pro generator.';
