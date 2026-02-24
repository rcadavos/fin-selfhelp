-- Optional due date for expense entries (loans, credit card, etc.)
alter table public.expense_entries
  add column if not exists due_date date;
