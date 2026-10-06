-- ─────────────────────────────────────────────────────────────────────────────
-- Push subscriptions — PWA push notifications for reminders
--
-- One row per browser or installed PWA that turned on push from
-- /account/notifications. The reminder cron sends every new in-app reminder to
-- each of the user's rows, and deletes a row once its push service answers
-- 404/410 (the browser dropped the subscription).
--
-- endpoint is unique, not (user_id, endpoint): a device belongs to whoever last
-- turned push on there, so signing in as someone else on the same browser moves
-- the row rather than duplicating it.
--
-- Written and read only with the service-role client (src/actions/push.ts,
-- src/lib/push.ts). The keys are bearer credentials for the device, so RLS is on
-- with no policies and anon/authenticated hold no table grants at all.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from public;
revoke all on table public.push_subscriptions from anon;
revoke all on table public.push_subscriptions from authenticated;
grant all on table public.push_subscriptions to service_role;

comment on table public.push_subscriptions is
  'Web push subscriptions, one per device; service role only. Reminders that create an in-app notification are also pushed here.';
