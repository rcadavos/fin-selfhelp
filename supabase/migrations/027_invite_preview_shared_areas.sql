-- Extend invite preview with which areas are shared (read-only flags on account_shares).

create or replace function public.get_invite_inviter_preview(p_share_id uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.account_shares%rowtype;
  grantor_uid uuid;
  meta_name text;
  email_addr text;
begin
  select * into r
  from public.account_shares
  where id = p_share_id
    and invite_token = p_token
    and status = 'pending';

  if r.id is null then
    return json_build_object('ok', false);
  end if;

  select p.user_id into grantor_uid
  from public.profiles p
  where p.id = r.grantor_profile_id;

  if grantor_uid is null then
    return json_build_object('ok', false);
  end if;

  select
    nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
    u.email::text
  into meta_name, email_addr
  from auth.users u
  where u.id = grantor_uid;

  return json_build_object(
    'ok', true,
    'inviter_name', meta_name,
    'inviter_email', email_addr,
    'can_view_expenses', r.can_view_expenses,
    'can_view_to_buy', r.can_view_to_buy,
    'can_view_net_worth', r.can_view_net_worth
  );
end;
$$;

comment on function public.get_invite_inviter_preview(uuid, uuid) is
  'Returns inviter identity and share flags for a valid pending invite; used on accept page.';

grant execute on function public.get_invite_inviter_preview(uuid, uuid) to authenticated;
