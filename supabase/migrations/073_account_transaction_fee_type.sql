-- Add 'fee' as a valid account transaction type.
-- The type column uses a named check constraint; drop and recreate it.

alter table account_transactions
  drop constraint if exists account_transactions_type_check;

alter table account_transactions
  add constraint account_transactions_type_check
  check (type in ('expense', 'income', 'adjustment', 'transfer', 'fee'));
