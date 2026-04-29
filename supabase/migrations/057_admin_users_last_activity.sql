-- Replace last_login_at with last_activity_at in the admin users RPC.
-- last_activity_at = GREATEST(auth last sign-in, profiles.last_active_date)
-- so the column reflects real app usage, not just authentication events.

drop function if exists public.get_users_for_admin();

create or replace function public.get_users_for_admin()
returns table (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  last_activity_at timestamptz,
  is_subscriber boolean,
  subscription_ends_at timestamptz,
  subscription_tier text,
  is_admin boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.profiles pr
    where pr.user_id = auth.uid() and pr.is_admin = true
  ) then
    raise exception 'Forbidden: admin only';
  end if;

  return query
  select
    u.id,
    u.email::text,
    nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), '')::text,
    u.created_at,
    u.email_confirmed_at,
    greatest(u.last_sign_in_at, p.last_active_date::timestamptz),
    coalesce(p.is_subscriber, false),
    p.subscription_ends_at,
    coalesce(p.subscription_tier, 'free'),
    coalesce(p.is_admin, false)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;
