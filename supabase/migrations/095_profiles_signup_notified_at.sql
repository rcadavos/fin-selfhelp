-- Admin alert on new signups: one email per account, never a repeat.
--
-- The alert is sent from the app (see src/lib/admin-new-user-alert.ts), which
-- runs on every authenticated visit to /auth/callback — email confirmation,
-- magic link and Google OAuth all land there, and a returning user lands there
-- again on every sign-in. This column is the claim flag that makes the send
-- happen exactly once: the sender does
--
--   update profiles set signup_notified_at = now()
--    where user_id = $1 and signup_notified_at is null
--
-- and only emails when that update returns a row, so concurrent callbacks and
-- re-visits cannot double-send.

alter table public.profiles
  add column if not exists signup_notified_at timestamptz;

-- Backfill every account that already exists. Without this, the first sign-in
-- of each existing user after deploy would look like a brand-new signup and
-- send an alert for the whole user base.
--
-- This restamps profiles.updated_at for every row via the profiles_updated_at
-- trigger. Nothing reads that column — the admin Users list derives last
-- activity from auth.users.last_sign_in_at and profiles.last_active_date
-- (migration 057) — so the write is left alone rather than disabling a trigger
-- mid-migration.
update public.profiles
   set signup_notified_at = now()
 where signup_notified_at is null;

comment on column public.profiles.signup_notified_at is
  'When the new-signup admin alert was sent for this account. Null = not yet notified. Backfilled for pre-existing accounts in migration 095.';
