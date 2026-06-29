-- New users get a 14-day Pro free trial on signup.
-- Re-introduces the automatic signup trial that was removed in migration 034,
-- now granting the Pro tier for 14 days (was 7 days in migration 033).
--
-- Trial users get: subscription_tier = 'pro', subscription_ends_at = now() + 14 days,
-- is_subscriber = false (default). The app's access logic
-- (hasProLevelProductAccess in src/lib/subscription-tier.ts) grants Pro features
-- while the window is active, then they fall back to free automatically.
-- Keep the interval in sync with TRIAL_DURATION_DAYS in src/lib/constants/trial.ts.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, net_take_home, currency, subscription_tier, subscription_ends_at)
  values (new.id, 0, 'PHP', 'pro', now() + interval '14 days');
  return new;
end;
$$ language plpgsql security definer;
