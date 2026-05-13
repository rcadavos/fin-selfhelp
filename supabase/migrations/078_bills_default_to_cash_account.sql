-- Backfill: link every bill with a null account_id to its profile's Cash account.
-- Migration 064 ensured every profile owns a "Cash" account and made it the
-- default for new users. This migration completes the picture by pointing any
-- legacy bills with account_id IS NULL at that same Cash account, so toggling
-- "paid" on a planned expense always has an account to debit (and so the
-- insufficient-funds check in toggleBillPayment can warn the user before they
-- overdraw it).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Safety net: profiles that somehow still don't have a Cash account get one
--    before we try to link bills to it. Mirrors migration 064 step 1.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.accounts (profile_id, account_alias, bank_name, tags, color)
select p.id, 'Cash', 'Cash', array['Cash']::text[], '#22c55e'
from public.profiles p
where exists (
  select 1
  from public.bills b
  where b.profile_id = p.id
    and b.account_id is null
)
and not exists (
  select 1
  from public.accounts a
  where a.profile_id = p.id
    and a.account_alias = 'Cash'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Point every bill with a null account_id at its profile's Cash account.
--    If a profile has multiple Cash-named accounts (e.g. manually created),
--    pick the oldest one for stability.
-- ─────────────────────────────────────────────────────────────────────────────
update public.bills b
set account_id = (
  select a.id
  from public.accounts a
  where a.profile_id = b.profile_id
    and a.account_alias = 'Cash'
  order by a.created_at asc
  limit 1
)
where b.account_id is null;
