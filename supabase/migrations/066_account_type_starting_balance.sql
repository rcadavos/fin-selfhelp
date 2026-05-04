-- Extend accounts with classification metadata used by the wallet detail page
-- and the new Net Balance summary on /dashboard/accounts.

alter table public.accounts
  add column if not exists account_type           text          not null default 'debit',
  add column if not exists starting_balance       numeric(14,2) not null default 0,
  add column if not exists interest_frequency     text          null,
  add column if not exists include_in_net_balance boolean       not null default true;

-- Account type: classification of the wallet (separate from `tags` which is descriptive).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_account_type_check'
  ) then
    alter table public.accounts
      add constraint accounts_account_type_check
      check (account_type in ('debit', 'credit', 'stocks', 'crypto'));
  end if;
end $$;

-- Interest frequency: nullable; only meaningful when set.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_interest_frequency_check'
  ) then
    alter table public.accounts
      add constraint accounts_interest_frequency_check
      check (
        interest_frequency is null
        or interest_frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'annually')
      );
  end if;
end $$;
