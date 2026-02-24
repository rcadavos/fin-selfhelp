-- Pro access lasts until this date. When subscription_ends_at > now(), user has Pro even if is_subscriber is false (e.g. after unsubscribe).
alter table public.profiles
  add column if not exists subscription_ends_at timestamptz default null;
comment on column public.profiles.subscription_ends_at is 'When the current Pro period ends. User has Pro access while this is in the future. Unsubscribing does not change this.';

-- Backfill: existing subscribers get 1 month from now so they keep access
update public.profiles
set subscription_ends_at = now() + interval '1 month'
where is_subscriber = true and subscription_ends_at is null;
