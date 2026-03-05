-- Extend get_users_for_admin to return is_admin; add RPC to set/remove admin.

drop function if exists public.get_users_for_admin();

create or replace function public.get_users_for_admin()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  is_subscriber boolean,
  subscription_ends_at timestamptz,
  is_admin boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true) then
    raise exception 'Forbidden: admin only';
  end if;
  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    coalesce(p.is_subscriber, false),
    p.subscription_ends_at,
    coalesce(p.is_admin, false)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

-- Allow admins to set or remove admin role for a user
create or replace function public.set_user_admin(
  target_user_id uuid,
  p_is_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true) then
    raise exception 'Forbidden: admin only';
  end if;
  update public.profiles
  set is_admin = p_is_admin, updated_at = now()
  where user_id = target_user_id;
end;
$$;
