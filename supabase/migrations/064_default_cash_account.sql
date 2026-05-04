-- Make "Cash" a real per-profile account (default for every new user) and
-- retire the static built-in accounts (Cash, Borrowed) backed by hardcoded UUIDs.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Backfill: ensure every existing profile owns a real "Cash" account.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.accounts (profile_id, account_alias, bank_name, tags, color)
select p.id, 'Cash', 'Cash', array['Cash']::text[], '#22c55e'
from public.profiles p
where not exists (
  select 1
  from public.accounts a
  where a.profile_id = p.id
    and a.account_alias = 'Cash'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Migrate existing references off the static UUIDs.
--    Static Cash:     00000000-0000-0000-0000-000000000001
--    Static Borrowed: 00000000-0000-0000-0000-000000000002
--
--    Cash references → the profile's new real Cash account.
--    Borrowed references → null (the built-in is being removed entirely).
-- ─────────────────────────────────────────────────────────────────────────────
update public.expense_entries e
set account_id = (
  select a.id
  from public.accounts a
  where a.profile_id = e.profile_id
    and a.account_alias = 'Cash'
  order by a.created_at asc
  limit 1
)
where e.account_id = '00000000-0000-0000-0000-000000000001';

update public.bills b
set account_id = (
  select a.id
  from public.accounts a
  where a.profile_id = b.profile_id
    and a.account_alias = 'Cash'
  order by a.created_at asc
  limit 1
)
where b.account_id = '00000000-0000-0000-0000-000000000001';

update public.expense_entries
set account_id = null
where account_id = '00000000-0000-0000-0000-000000000002';

update public.bills
set account_id = null
where account_id = '00000000-0000-0000-0000-000000000002';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Update the new-user trigger to seed a Cash account alongside the profile.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_profile_id uuid;
begin
  insert into public.profiles (user_id, net_take_home, currency)
  values (new.id, 0, 'PHP')
  returning id into new_profile_id;

  insert into public.accounts (profile_id, account_alias, bank_name, tags, color)
  values (new_profile_id, 'Cash', 'Cash', array['Cash']::text[], '#22c55e');

  return new;
end;
$$ language plpgsql security definer;
