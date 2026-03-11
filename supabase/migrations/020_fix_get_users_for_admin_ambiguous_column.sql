-- Fix: "column reference is_admin is ambiguous" in get_users_for_admin.
-- The return table has a column named is_admin which conflicts with the
-- unqualified profiles.is_admin reference in the guard check.

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
    u.created_at,
    coalesce(p.is_subscriber, false),
    p.subscription_ends_at,
    coalesce(p.is_admin, false)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;
