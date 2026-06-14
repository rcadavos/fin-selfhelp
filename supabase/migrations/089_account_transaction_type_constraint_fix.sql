-- Migration 065 created the `type` check constraint inline (auto-named by Postgres).
-- Migrations 073 and 084 used DROP/ADD on the explicitly-named
-- `account_transactions_type_check`. In some environments the constraint named
-- `account_transactions_type_check` still carries an OUTDATED definition (e.g. only
-- expense/income/adjustment/transfer), so inserting a `fee` row — the transfer fee —
-- fails with a check-constraint violation, which surfaces as "unable to transfer".
--
-- Note: Postgres normalizes `type in (...)` to `type = ANY (ARRAY[...])` in the stored
-- constraint definition, so a LIKE '%type in %' match never fires. Instead we drop
-- EVERY check constraint on the table (the type check is the only one) and re-add a
-- single authoritative one. This is idempotent and independent of the prior name.

do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.account_transactions'::regclass
      and contype = 'c'
  loop
    execute format(
      'alter table public.account_transactions drop constraint if exists %I',
      r.conname
    );
  end loop;
end $$;

alter table public.account_transactions
  add constraint account_transactions_type_check
  check (type in ('expense', 'income', 'adjustment', 'transfer', 'fee', 'auto_pay'));
