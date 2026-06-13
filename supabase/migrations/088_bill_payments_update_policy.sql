-- bill_payments (migration 050) was created with SELECT, INSERT, and DELETE RLS
-- policies but NO UPDATE policy. That was fine while the mark-paid flow was a
-- pure binary toggle (insert a row to pay, delete it to unpay).
--
-- Once partial payments (082) and failed auto-debit status (086) landed,
-- markBillPaid() started UPDATEing an existing row in place:
--   • failed -> paid  (resolving a failed auto-debit by marking it paid), and
--   • adding to an existing partial payment.
-- Those UPDATEs run on the user's RLS-bound client. With no UPDATE policy the
-- command matches zero rows and silently succeeds (PostgREST returns no error),
-- so the row stays status='failed' and the change is lost after refetch — i.e.
-- "a failed auto-debit cannot be marked as paid".
--
-- The cron (auto-debit) and the grantee toggle use the service-role client and
-- bypass RLS, which is why only the owner's manual mark-paid was affected.
--
-- Add the missing UPDATE policy so an owner can update their own bill_payments.

drop policy if exists "Users can update own bill payments" on public.bill_payments;

create policy "Users can update own bill payments"
  on public.bill_payments for update
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );
