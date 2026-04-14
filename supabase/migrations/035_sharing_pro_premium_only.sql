-- Partner sharing: only grantors with active Pro- or Premium-level product access may create invites
-- or change shared areas. Revoking to status = 'revoked' stays allowed for cleanup.

create or replace function public.profile_has_pro_product_access(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.subscription_tier in ('pro', 'premium')
      and (
        coalesce(p.subscription_ends_at, 'epoch'::timestamptz) > now()
        or p.is_subscriber = true
      )
  );
$$;

comment on function public.profile_has_pro_product_access(uuid) is
  'True when profile has Pro- or Premium-level product access (due dates tier gate); used for account_shares RLS.';

revoke all on function public.profile_has_pro_product_access(uuid) from public;
grant execute on function public.profile_has_pro_product_access(uuid) to authenticated;

drop policy if exists "account_shares_insert_grantor" on public.account_shares;
create policy "account_shares_insert_grantor"
  on public.account_shares for insert
  with check (
    grantor_profile_id = public.profile_id_for_uid(auth.uid())
    and public.profile_has_pro_product_access(grantor_profile_id)
  );

drop policy if exists "account_shares_update_grantor" on public.account_shares;
create policy "account_shares_update_grantor"
  on public.account_shares for update
  using (grantor_profile_id = public.profile_id_for_uid(auth.uid()))
  with check (
    grantor_profile_id = public.profile_id_for_uid(auth.uid())
    and (
      public.profile_has_pro_product_access(grantor_profile_id)
      or status = 'revoked'
    )
  );

create or replace function public.accept_account_share(p_share_id uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  r public.account_shares%rowtype;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_email := lower(trim(auth.jwt() ->> 'email'));
  if v_email is null or length(v_email) = 0 then
    return json_build_object('ok', false, 'error', 'no_email_on_session');
  end if;

  select * into r
  from public.account_shares
  where id = p_share_id
    and invite_token = p_token
    and status = 'pending';

  if r.id is null then
    return json_build_object('ok', false, 'error', 'invalid_or_used_invite');
  end if;

  if lower(trim(r.invite_email)) is distinct from v_email then
    return json_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  if not public.profile_has_pro_product_access(r.grantor_profile_id) then
    return json_build_object('ok', false, 'error', 'grantor_subscription_required');
  end if;

  update public.account_shares
  set
    status = 'accepted',
    accepted_at = now(),
    grantee_user_id = auth.uid()
  where id = p_share_id;

  return json_build_object('ok', true);
end;
$$;
