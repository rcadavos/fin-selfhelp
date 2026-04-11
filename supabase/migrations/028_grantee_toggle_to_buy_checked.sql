-- Grantees with can_view_to_buy may toggle `checked` on the grantor's list (cross items off).
-- RLS only allows SELECT for grantees; updates go through this SECURITY DEFINER function.

create or replace function public.grantee_set_to_buy_item_checked(p_item_id uuid, p_checked boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_updated uuid;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select profile_id into v_profile_id
  from public.to_buy_items
  where id = p_item_id;

  if v_profile_id is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  if not exists (
    select 1 from public.account_shares s
    where s.grantor_profile_id = v_profile_id
      and s.grantee_user_id = auth.uid()
      and s.status = 'accepted'
      and s.can_view_to_buy = true
  ) then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.to_buy_items
  set checked = p_checked
  where id = p_item_id
  returning id into v_updated;

  if v_updated is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  return json_build_object('ok', true);
end;
$$;

comment on function public.grantee_set_to_buy_item_checked(uuid, boolean) is
  'Grantee toggles checked on grantor to_buy_items when share has can_view_to_buy.';

grant execute on function public.grantee_set_to_buy_item_checked(uuid, boolean) to authenticated;
