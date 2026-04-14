-- No automatic Pro trial on signup; clear due dates / reminders for profiles without active Pro access.

-- 1) New users: free tier, no subscription window (no due dates / reminders until they pay).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, net_take_home, currency, subscription_tier)
  values (new.id, 0, 'PHP', 'free');
  return new;
end;
$$ language plpgsql security definer;

-- 2) Admin RPC: drop free_trial (treat as free); keep pro / premium / paid legacy.
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

  if v_tier = 'free_trial' then
    v_tier := 'free';
  end if;

  update public.profiles
  set
    subscription_tier = case
      when v_tier = 'free' then 'free'
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
      when v_tier in ('pro', 'premium') then coalesce(p_expires_at, now() + interval '1 month')
      else null
    end,
    updated_at = now()
  where user_id = target_user_id;
end;
$$;

-- 3) One-time: remove due_date / reminder for anyone who does not currently have Pro-level access
--    (same rule as app: tier pro|premium AND (subscription_ends_at > now() OR is_subscriber)).
update public.expense_entries e
set due_date = null, reminder_days_before = null
from public.profiles p
where e.profile_id = p.id
  and (e.due_date is not null or e.reminder_days_before is not null)
  and not (
    p.subscription_tier in ('pro', 'premium')
    and (
      coalesce(p.subscription_ends_at, 'epoch'::timestamptz) > now()
      or p.is_subscriber = true
    )
  );
