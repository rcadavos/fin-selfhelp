-- Add free_trial tier: same Pro access as paid (subscription_ends_at) but is_subscriber = false.
-- Paid tier (is_subscriber = true) is required for reviews and suggestions; free_trial cannot submit.

drop function if exists public.update_user_subscription(uuid, boolean, timestamptz);

create or replace function public.update_user_subscription(
  target_user_id uuid,
  p_tier text,  -- 'free' | 'free_trial' | 'paid'
  p_expires_at timestamptz default null
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
    is_subscriber = case when p_tier = 'paid' then true else false end,
    subscription_ends_at = case
      when p_tier = 'free' then null
      when p_tier = 'free_trial' then coalesce(p_expires_at, now() + interval '7 days')
      when p_tier = 'paid' then coalesce(p_expires_at, now() + interval '1 month')
      else null
    end,
    updated_at = now()
  where user_id = target_user_id;
end;
$$;
