-- Pro / Premium tiers, subscription_tier on profiles, two pricing rows, admin RPC updates.

-- 1) profiles.subscription_tier
alter table public.profiles
  add column if not exists subscription_tier text not null default 'free';

alter table public.profiles
  drop constraint if exists profiles_subscription_tier_check;

alter table public.profiles
  add constraint profiles_subscription_tier_check
  check (subscription_tier in ('free', 'pro', 'premium'));

comment on column public.profiles.subscription_tier is 'Product tier while subscription is active; free when no active window.';

-- Backfill: anyone with active trial or paid gets pro (premium stays rare / set by admin or payment metadata).
update public.profiles p
set subscription_tier = 'pro'
where
  p.is_subscriber = true
  or (p.subscription_ends_at is not null and p.subscription_ends_at > now());

-- 2) subscription_plan: rename default -> pro, ensure pro row, add premium
update public.subscription_plan set id = 'pro' where id = 'default';

insert into public.subscription_plan (id, name, price_amount, price_currency, interval, original_price_amount)
select 'pro', 'Pro', 3, 'USD', 'month', 20
where not exists (select 1 from public.subscription_plan where id = 'pro');

insert into public.subscription_plan (id, name, price_amount, price_currency, interval, original_price_amount)
values ('premium', 'Premium', 9.99, 'USD', 'month', null)
on conflict (id) do nothing;

-- 3) New user trial = pro tier for 7 days
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, net_take_home, currency, subscription_ends_at, subscription_tier)
  values (new.id, 0, 'PHP', now() + interval '7 days', 'pro');
  return new;
end;
$$ language plpgsql security definer;

-- 4) Admin user list includes tier
drop function if exists public.get_users_for_admin();

create or replace function public.get_users_for_admin()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
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
    u.created_at,
    coalesce(p.is_subscriber, false),
    p.subscription_ends_at,
    coalesce(p.subscription_tier, 'free'),
    coalesce(p.is_admin, false)
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

-- 5) Admin set subscription (free | free_trial | pro | premium | paid legacy -> pro)
drop function if exists public.update_user_subscription(uuid, text, timestamptz);

create or replace function public.update_user_subscription(
  target_user_id uuid,
  p_tier text,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text := lower(trim(p_tier));
begin
  if not exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true) then
    raise exception 'Forbidden: admin only';
  end if;

  if v_tier = 'paid' then
    v_tier := 'pro';
  end if;

  update public.profiles
  set
    subscription_tier = case
      when v_tier = 'free' then 'free'
      when v_tier = 'free_trial' then 'pro'
      when v_tier = 'pro' then 'pro'
      when v_tier = 'premium' then 'premium'
      else 'free'
    end,
    is_subscriber = case
      when v_tier in ('pro', 'premium') then true
      else false
    end,
    subscription_ends_at = case
      when v_tier = 'free' then null
      when v_tier = 'free_trial' then coalesce(p_expires_at, now() + interval '7 days')
      when v_tier in ('pro', 'premium') then coalesce(p_expires_at, now() + interval '1 month')
      else null
    end,
    updated_at = now()
  where user_id = target_user_id;
end;
$$;
