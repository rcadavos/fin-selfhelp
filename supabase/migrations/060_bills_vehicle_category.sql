-- Classify transport planned expenses linked to a vehicle (mirrors expense_entries.vehicle_category).
alter table public.bills
  add column if not exists vehicle_category text null;
