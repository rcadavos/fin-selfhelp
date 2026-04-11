-- Grantee can resolve grantor name/email from auth.users when an accepted share exists (for "Shared with me" UI).

create or replace function public.grantee_grantor_display(p_grantor_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  gpid uuid;
  meta_name text;
  email_addr text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select p.id into gpid
  from public.profiles p
  where p.user_id = p_grantor_user_id;

  if gpid is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1 from public.account_shares s
    where s.grantor_profile_id = gpid
      and s.grantee_user_id = auth.uid()
      and s.status = 'accepted'
  ) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select
    nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
    u.email::text
  into meta_name, email_addr
  from auth.users u
  where u.id = p_grantor_user_id;

  return json_build_object(
    'ok', true,
    'name', meta_name,
    'email', email_addr
  );
end;
$$;

comment on function public.grantee_grantor_display(uuid) is
  'Returns grantor full_name (metadata) and email for grantee with an accepted share.';

grant execute on function public.grantee_grantor_display(uuid) to authenticated;
