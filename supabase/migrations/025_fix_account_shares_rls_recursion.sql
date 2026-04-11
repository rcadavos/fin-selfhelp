-- Break infinite RLS recursion between profiles and account_shares:
-- profiles_select_shared_grantee reads account_shares; grantor policies on
-- account_shares used "exists (select 1 from profiles ...)" which re-entered
-- profiles policies. Use SECURITY DEFINER to read profile id without RLS.

create or replace function public.profile_id_for_uid(uid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles where user_id = uid limit 1;
$$;

comment on function public.profile_id_for_uid(uuid) is
  'Returns the current user profile id; SECURITY DEFINER avoids RLS recursion with account_shares policies.';

grant execute on function public.profile_id_for_uid(uuid) to authenticated;

drop policy if exists "account_shares_select_grantor" on public.account_shares;
create policy "account_shares_select_grantor"
  on public.account_shares for select
  using (grantor_profile_id = public.profile_id_for_uid(auth.uid()));

drop policy if exists "account_shares_insert_grantor" on public.account_shares;
create policy "account_shares_insert_grantor"
  on public.account_shares for insert
  with check (grantor_profile_id = public.profile_id_for_uid(auth.uid()));

drop policy if exists "account_shares_update_grantor" on public.account_shares;
create policy "account_shares_update_grantor"
  on public.account_shares for update
  using (grantor_profile_id = public.profile_id_for_uid(auth.uid()));

drop policy if exists "account_shares_delete_grantor" on public.account_shares;
create policy "account_shares_delete_grantor"
  on public.account_shares for delete
  using (grantor_profile_id = public.profile_id_for_uid(auth.uid()));
