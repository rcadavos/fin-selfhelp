-- Auto-debit flag on bills.
-- When true the nightly auto-debit cron marks the bill as paid on its due date,
-- deducts the amount from the linked account, and creates a matching expense entry.

alter table public.bills
  add column if not exists is_auto_debit boolean not null default false;
