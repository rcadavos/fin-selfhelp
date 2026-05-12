-- Link account_transactions and expense_entries created when a planned expense
-- (bill) is marked paid back to their owning bill_payments row, so unmarking
-- a bill cleanly reverses the deduction and the auto-created expense via FK
-- cascade delete.

alter table public.account_transactions
  add column if not exists bill_payment_id uuid
  references public.bill_payments(id) on delete cascade;

create index if not exists account_transactions_bill_payment_id_idx
  on public.account_transactions (bill_payment_id)
  where bill_payment_id is not null;

alter table public.expense_entries
  add column if not exists bill_payment_id uuid
  references public.bill_payments(id) on delete cascade;

create index if not exists expense_entries_bill_payment_id_idx
  on public.expense_entries (bill_payment_id)
  where bill_payment_id is not null;
