-- Grantees with can_view_expenses may mark bills paid / unpaid for the grantor’s month (expense_payments rows).
-- Mirrors app logic in toggleExpensePayment; RLS only allows grantee SELECT on expense_payments.

create or replace function public.grantee_toggle_expense_payment(
  p_expense_entry_id uuid,
  p_paid_month text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_existing_id uuid;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_paid_month is null or p_paid_month !~ '^\d{4}-\d{2}$' then
    return json_build_object('ok', false, 'error', 'invalid_month');
  end if;

  select profile_id into v_profile_id
  from public.expense_entries
  where id = p_expense_entry_id;

  if v_profile_id is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1 from public.account_shares s
    where s.grantor_profile_id = v_profile_id
      and s.grantee_user_id = auth.uid()
      and s.status = 'accepted'
      and s.can_view_expenses = true
  ) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select id into v_existing_id
  from public.expense_payments
  where expense_entry_id = p_expense_entry_id
    and profile_id = v_profile_id
    and paid_month = p_paid_month;

  if v_existing_id is not null then
    delete from public.expense_payments where id = v_existing_id;
    return json_build_object('ok', true, 'paid', false);
  end if;

  insert into public.expense_payments (expense_entry_id, profile_id, paid_month)
  values (p_expense_entry_id, v_profile_id, p_paid_month);

  return json_build_object('ok', true, 'paid', true);
end;
$$;

comment on function public.grantee_toggle_expense_payment(uuid, text) is
  'Grantee toggles paid status for grantor expense in paid_month when share has can_view_expenses.';

grant execute on function public.grantee_toggle_expense_payment(uuid, text) to authenticated;
