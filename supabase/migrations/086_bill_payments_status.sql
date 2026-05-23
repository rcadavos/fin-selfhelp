-- Track auto-debit failure as first-class state on bill_payments. A failed
-- auto-debit (insufficient balance, missing account, insert error, side-effect
-- rollback) now upserts a row with status='failed' and amount_paid=0, so the
-- UI can show a "Failed" badge and the cron will retry on subsequent runs
-- (replacing the failed row with status='paid' on success).
--
-- Status semantics:
--   'paid'   → real payment; amount_paid > 0 (full or partial)
--   'failed' → auto-debit attempt that did not go through; amount_paid = 0
--
-- The (bill_id, paid_month) unique index already in place lets the cron upsert
-- on conflict and overwrite a prior failed row when the retry succeeds.

alter table public.bill_payments
  add column if not exists status         text not null default 'paid',
  add column if not exists failure_reason text;

alter table public.bill_payments
  drop constraint if exists bill_payments_status_check;

alter table public.bill_payments
  add constraint bill_payments_status_check
    check (status in ('paid', 'failed'));

-- Failed rows record amount_paid = 0 (no money moved). Paid rows keep the
-- existing nonneg constraint from migration 082.
alter table public.bill_payments
  drop constraint if exists bill_payments_failed_zero_amount;

alter table public.bill_payments
  add constraint bill_payments_failed_zero_amount
    check (status <> 'failed' or amount_paid = 0);

create index if not exists bill_payments_profile_month_status
  on public.bill_payments (profile_id, paid_month, status);
