-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: the original "Debtors can view their receivable links" SELECT policy
-- in migration 061 referenced auth.users.email, which authenticated users
-- cannot read — causing "permission denied for table users" whenever the
-- owner did .insert(...).select() on receivable_links (PostgREST runs the
-- SELECT policy on the returning row).
--
-- Replace with auth.jwt() ->> 'email', which reads the email directly from
-- the JWT claims and requires no privileged table access.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "Debtors can view their receivable links" on public.receivable_links;

create policy "Debtors can view their receivable links"
  on public.receivable_links for select
  using (
    debtor_user_id = auth.uid()
    or (
      status = 'pending'
      and lower(debtor_email) = lower(auth.jwt() ->> 'email')
    )
  );
