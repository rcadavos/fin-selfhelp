-- ─────────────────────────────────────────────────────────────────────────────
-- bill_skips — bills the user skipped in the Bills page's "Needs you now" panel
--
-- One row per bill per month. Skipping moves the panel on to the next bill and
-- is remembered for that month only: a bill skipped in 2026-11 is featured again
-- in 2026-12. Skipping changes nothing else: the bill stays unpaid, stays in
-- the list and still counts toward the month's totals.
--
-- skip_month mirrors bill_payments.paid_month ('YYYY-MM', the month being viewed).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.bill_skips (
  id          uuid        primary key default gen_random_uuid(),
  bill_id     uuid        not null references public.bills(id) on delete cascade,
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  skip_month  text        not null,
  created_at  timestamptz not null default now(),
  constraint bill_skips_skip_month_format check (skip_month ~ '^\d{4}-\d{2}$')
);

create unique index if not exists bill_skips_bill_month
  on public.bill_skips (bill_id, skip_month);

create index if not exists bill_skips_profile_month
  on public.bill_skips (profile_id, skip_month);

alter table public.bill_skips enable row level security;

revoke all on table public.bill_skips from anon;

drop policy if exists "Users can view own bill skips" on public.bill_skips;
create policy "Users can view own bill skips"
  on public.bill_skips for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- The bill must belong to the same profile, so a skip can't point at someone
-- else's bill.
drop policy if exists "Users can insert own bill skips" on public.bill_skips;
create policy "Users can insert own bill skips"
  on public.bill_skips for insert
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
    and exists (select 1 from public.bills b where b.id = bill_id and b.profile_id = bill_skips.profile_id)
  );

drop policy if exists "Users can delete own bill skips" on public.bill_skips;
create policy "Users can delete own bill skips"
  on public.bill_skips for delete
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

comment on table public.bill_skips is
  'Bills skipped in the Bills page "Needs you now" panel, one row per bill per month. Hides the bill from that panel for the month only.';
