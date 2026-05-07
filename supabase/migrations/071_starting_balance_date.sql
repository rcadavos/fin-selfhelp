-- Tracks when the starting_balance was last configured for an account.
-- Used by the net balance history chart to avoid retroactively applying
-- a starting balance to days before the user set it up.
-- DEFAULT now() means existing rows get today's date (migration run time),
-- so the chart shows the starting balance only from today forward for old accounts.
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS starting_balance_date timestamptz NOT NULL DEFAULT now();
