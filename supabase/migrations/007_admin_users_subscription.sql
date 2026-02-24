-- Extend get_users_for_admin to return subscription fields (join profiles)
-- Must drop first because return type (row) changed
drop function if exists public.get_users_for_admin();

create or replace function public.get_users_for_admin()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  is_subscriber boolean,
  subscription_ends_at timestamptz
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
    p.subscription_ends_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

-- Allow admins to set a user's subscription (free or paid with expiry)
create or replace function public.update_user_subscription(
  target_user_id uuid,
  p_is_subscriber boolean,
  p_subscription_ends_at timestamptz default null
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
  set
    is_subscriber = p_is_subscriber,
    subscription_ends_at = case
      when p_is_subscriber then coalesce(p_subscription_ends_at, now() + interval '1 month')
      else null
    end,
    updated_at = now()
  where user_id = target_user_id;
end;
$$;
