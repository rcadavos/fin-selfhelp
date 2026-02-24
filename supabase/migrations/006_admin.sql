-- Admin flag: when true, user can access /admin and list users
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
comment on column public.profiles.is_admin is 'When true, user can access admin dashboard and list users.';

-- RLS: admins can read all profiles (for future admin features)
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.is_admin = true
    )
  );

-- Function: return users (id, email, created_at) for admin dashboard. Only callable by admins.
create or replace function public.get_users_for_admin()
returns table (
  id uuid,
  email text,
  created_at timestamptz
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
  select u.id, u.email::text, u.created_at
  from auth.users u
  order by u.created_at desc;
end;
$$;
