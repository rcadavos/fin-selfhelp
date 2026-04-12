-- Normalize expense due dates to monthly anchors (1970-01-{day}); only the calendar day is used in the app.
update public.expense_entries
set due_date = to_date(
  '1970-01-' || lpad(extract(day from due_date::date)::text, 2, '0'),
  'YYYY-MM-DD'
)
where due_date is not null;

comment on column public.expense_entries.due_date is
  'Day-of-month the bill is due, repeating each calendar month. Stored as 1970-01-{DD} after migration 030; legacy rows used any date.';
