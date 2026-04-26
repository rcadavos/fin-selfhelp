-- Drop FK constraints on account_id so static built-in account IDs
-- (Cash, Borrowed) can be stored without a matching row in the accounts table.

alter table public.expense_entries
  drop constraint if exists expense_entries_account_id_fkey;

alter table public.bills
  drop constraint if exists bills_account_id_fkey;
