-- Separate recurring bills (expense_entries with due_date) into their own table.
-- After this migration expense_entries holds only non-recurring daily expenses.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. bills table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.bills (
  id                   uuid        primary key default gen_random_uuid(),
  profile_id           uuid        not null references public.profiles(id) on delete cascade,
  category_id          text        not null,
  amount               numeric     not null default 0,
  note                 text,
  notes                text,
  -- Stored as canonical 1970-01-{DD}; only the day-of-month is meaningful for monthly recurrence.
  due_date             date        not null,
  billing_period       text        not null default 'monthly'
    constraint bills_billing_period_check check (billing_period in ('monthly', 'quarterly', 'yearly')),
  -- For yearly bills: month (1–12) when the bill is due.
  due_month            smallint
    constraint bills_due_month_check check (due_month is null or due_month between 1 and 12),
  reminder_days_before smallint[],
  reminder_channel     text        not null default 'both',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger bills_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. bill_payments table  (mirrors expense_payments, references bills instead)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.bill_payments (
  id         uuid        primary key default gen_random_uuid(),
  bill_id    uuid        not null references public.bills(id) on delete cascade,
  profile_id uuid        not null references public.profiles(id) on delete cascade,
  paid_month text        not null,
  paid_at    timestamptz not null default now(),
  constraint bill_payments_paid_month_format check (paid_month ~ '^\d{4}-\d{2}$')
);

create unique index if not exists bill_payments_bill_month
  on public.bill_payments (bill_id, paid_month);

create index if not exists bill_payments_profile_month
  on public.bill_payments (profile_id, paid_month);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Migrate data — copy bills out of expense_entries (preserve UUIDs)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.bills (
  id, profile_id, category_id, amount, note, notes,
  due_date, billing_period, due_month,
  reminder_days_before, reminder_channel,
  created_at, updated_at
)
select
  id, profile_id, category_id, amount, note, notes,
  due_date, billing_period, due_month,
  reminder_days_before, reminder_channel,
  created_at, updated_at
from public.expense_entries
where due_date is not null;

-- Migrate payment records for the moved bills
insert into public.bill_payments (id, bill_id, profile_id, paid_month, paid_at)
select ep.id, ep.expense_entry_id, ep.profile_id, ep.paid_month, ep.paid_at
from public.expense_payments ep
where exists (
  select 1 from public.bills b where b.id = ep.expense_entry_id
);

-- Remove migrated rows from expense_entries (cascades expense_payments)
delete from public.expense_entries where due_date is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — bills
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.bills enable row level security;

create policy "Users can view own bills"
  on public.bills for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can insert own bills"
  on public.bills for insert
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can update own bills"
  on public.bills for update
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can delete own bills"
  on public.bills for delete
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- Grantees with can_view_expenses may read the grantor's bills
create policy "Grantees can view shared bills"
  on public.bills for select
  using (
    exists (
      select 1 from public.account_shares s
      where s.grantor_profile_id = profile_id
        and s.grantee_user_id   = auth.uid()
        and s.status            = 'accepted'
        and s.can_view_expenses = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS — bill_payments
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.bill_payments enable row level security;

create policy "Users can view own bill payments"
  on public.bill_payments for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can insert own bill payments"
  on public.bill_payments for insert
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can delete own bill payments"
  on public.bill_payments for delete
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- Grantees may read the grantor's bill_payments (needed for shared view)
create policy "Grantees can view shared bill payments"
  on public.bill_payments for select
  using (
    exists (
      select 1
      from public.bills b
      join public.account_shares s on s.grantor_profile_id = b.profile_id
      where b.id                  = bill_id
        and s.grantee_user_id     = auth.uid()
        and s.status              = 'accepted'
        and s.can_view_expenses   = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC — grantee toggle bill payment  (mirrors grantee_toggle_expense_payment)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.grantee_toggle_bill_payment(
  p_bill_id    uuid,
  p_paid_month text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_existing_id uuid;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_paid_month is null or p_paid_month !~ '^\d{4}-\d{2}$' then
    return json_build_object('ok', false, 'error', 'invalid_month');
  end if;

  select profile_id into v_profile_id from public.bills where id = p_bill_id;

  if v_profile_id is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1 from public.account_shares s
    where s.grantor_profile_id = v_profile_id
      and s.grantee_user_id    = auth.uid()
      and s.status             = 'accepted'
      and s.can_view_expenses  = true
  ) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select id into v_existing_id
  from public.bill_payments
  where bill_id    = p_bill_id
    and profile_id = v_profile_id
    and paid_month = p_paid_month;

  if v_existing_id is not null then
    delete from public.bill_payments where id = v_existing_id;
    return json_build_object('ok', true, 'paid', false);
  end if;

  insert into public.bill_payments (bill_id, profile_id, paid_month)
  values (p_bill_id, v_profile_id, p_paid_month);

  return json_build_object('ok', true, 'paid', true);
end;
$$;

comment on function public.grantee_toggle_bill_payment(uuid, text) is
  'Grantee toggles paid status for a grantor bill in paid_month when share has can_view_expenses.';

grant execute on function public.grantee_toggle_bill_payment(uuid, text) to authenticated;
