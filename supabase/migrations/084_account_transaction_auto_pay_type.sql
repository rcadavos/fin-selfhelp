-- Add 'auto_pay' as a valid account transaction type so the account history
-- can distinguish auto-debited planned expenses from manual expenses.

alter table account_transactions
  drop constraint if exists account_transactions_type_check;

alter table account_transactions
  add constraint account_transactions_type_check
  check (type in ('expense', 'income', 'adjustment', 'transfer', 'fee', 'auto_pay'));
