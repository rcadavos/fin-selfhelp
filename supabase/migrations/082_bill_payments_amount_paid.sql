-- Add per-payment amount to bill_payments so a planned expense can be
-- partially paid for a given month. Status is computed in the app:
--   amount_paid >= bill.amount        → fully paid
--   0 < amount_paid < bill.amount     → partially paid
--   no row at all                      → unpaid
--
-- Backfill: every existing row was a full payment (binary toggle), so set
-- amount_paid = bill.amount for current rows. After backfill the column is
-- NOT NULL and must be set explicitly on every future INSERT. We disallow
-- negative values; zero is allowed (defensively — the app rejects it).

alter table public.bill_payments
  add column if not exists amount_paid numeric(14, 2);

update public.bill_payments bp
   set amount_paid = b.amount
  from public.bills b
 where bp.bill_id = b.id
   and bp.amount_paid is null;

alter table public.bill_payments
  alter column amount_paid set not null;

alter table public.bill_payments
  drop constraint if exists bill_payments_amount_paid_nonneg;

alter table public.bill_payments
  add constraint bill_payments_amount_paid_nonneg check (amount_paid >= 0);
