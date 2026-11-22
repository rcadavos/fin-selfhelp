-- ─────────────────────────────────────────────────────────────────────────────
-- bill_carryovers — a monthly bill's unpaid balance moved into the next month
--
-- One row per bill per month carried out of. Carrying over:
--   • marks the bill skipped in from_month: nothing more is owed there, and its
--     payments for that month are locked until the carry-over is undone;
--   • adds `amount` to what the bill asks for in to_month.
-- bills.amount is never touched, so every later month asks for the usual amount.
--
-- amount is a snapshot of what was still owed in from_month (the bill's amount,
-- plus anything carried into from_month, minus what was paid there). to_month is
-- always the month after from_month; the server action sets both.
--
-- note is an optional reason shown on the bill in both months.
-- Months use the same 'YYYY-MM' key as bill_payments.paid_month.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.bill_carryovers (
  id          uuid          primary key default gen_random_uuid(),
  bill_id     uuid          not null references public.bills(id) on delete cascade,
  profile_id  uuid          not null references public.profiles(id) on delete cascade,
  from_month  text          not null,
  to_month    text          not null,
  amount      numeric(14,2) not null,
  note        text,
  created_at  timestamptz   not null default now(),
  constraint bill_carryovers_from_month_format check (from_month ~ '^\d{4}-\d{2}$'),
  constraint bill_carryovers_to_month_format   check (to_month   ~ '^\d{4}-\d{2}$'),
  constraint bill_carryovers_forward           check (to_month > from_month),
  constraint bill_carryovers_amount_positive   check (amount > 0),
  constraint bill_carryovers_note_length       check (note is null or char_length(note) <= 500)
);

create unique index if not exists bill_carryovers_bill_from_month
  on public.bill_carryovers (bill_id, from_month);

create index if not exists bill_carryovers_profile_from_month
  on public.bill_carryovers (profile_id, from_month);

create index if not exists bill_carryovers_profile_to_month
  on public.bill_carryovers (profile_id, to_month);

alter table public.bill_carryovers enable row level security;

revoke all on table public.bill_carryovers from anon;

drop policy if exists "Users can view own bill carryovers" on public.bill_carryovers;
create policy "Users can view own bill carryovers"
  on public.bill_carryovers for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- The bill must belong to the same profile, so a carry-over can't point at
-- someone else's bill.
drop policy if exists "Users can insert own bill carryovers" on public.bill_carryovers;
create policy "Users can insert own bill carryovers"
  on public.bill_carryovers for insert
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
    and exists (select 1 from public.bills b where b.id = bill_id and b.profile_id = bill_carryovers.profile_id)
  );

drop policy if exists "Users can delete own bill carryovers" on public.bill_carryovers;
create policy "Users can delete own bill carryovers"
  on public.bill_carryovers for delete
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

comment on table public.bill_carryovers is
  'A monthly bill''s unpaid balance carried into the next month. Skips the bill in from_month and adds amount to to_month. bills.amount is unchanged.';
