-- ─────────────────────────────────────────────────────────────────────────────
-- Two-step verification by email
--
-- A user who turns this on at /account/security gets a 6-digit code by email
-- after every correct email + password login, and gets no session until the
-- code is entered. Whether it is on lives in auth.users.raw_app_meta_data
-- ->> 'two_factor_email' (service role only), not in this table.
--
-- One row per (user, purpose): the code currently out for signing in, turning
-- the feature on, or turning it off. Issuing a new code overwrites the row, a
-- correct code deletes it. Only the SHA-256 of the code is stored.
--
-- sends / sends_window_started_at cap how many codes go out per hour, and
-- attempts caps wrong guesses per code; both survive a wrong code so the caps
-- can't be reset by failing.
--
-- Written and read only with the service-role client (src/actions/two-factor.ts).
-- A row is an authentication secret, so RLS is on with no policies and
-- anon/authenticated hold no table grants at all.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.two_factor_challenges (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  purpose                 text        not null
    constraint two_factor_challenges_purpose_check check (purpose in ('sign_in', 'enable', 'disable')),
  code_hash               text        not null,
  attempts                integer     not null default 0,
  sends                   integer     not null default 1,
  sends_window_started_at timestamptz not null default now(),
  last_sent_at            timestamptz not null default now(),
  expires_at              timestamptz not null,
  created_at              timestamptz not null default now(),
  constraint two_factor_challenges_user_purpose_key unique (user_id, purpose)
);

alter table public.two_factor_challenges enable row level security;

revoke all on table public.two_factor_challenges from public;
revoke all on table public.two_factor_challenges from anon;
revoke all on table public.two_factor_challenges from authenticated;
grant all on table public.two_factor_challenges to service_role;

comment on table public.two_factor_challenges is
  'Emailed 6-digit codes for two-step verification (sign in, turn on, turn off); service role only.';
comment on column public.two_factor_challenges.code_hash is
  'sha256(user_id:purpose:code), hex. The code itself is never stored.';
