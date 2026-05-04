-- Add vehicle_category column to expense_entries
-- Used to classify transport expenses linked to a vehicle
ALTER TABLE expense_entries ADD COLUMN IF NOT EXISTS vehicle_category TEXT NULL;
