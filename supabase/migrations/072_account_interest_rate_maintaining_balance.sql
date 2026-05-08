-- Add interest_rate (annual %, nullable) and maintaining_balance (nullable)
-- to accounts. Both are optional; null means "not set".

alter table public.accounts
  add column if not exists interest_rate      numeric(10,4) default null,
  add column if not exists maintaining_balance numeric(15,2) default null;
