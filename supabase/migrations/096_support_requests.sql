-- ─────────────────────────────────────────────────────────────────────────────
-- Support requests — "Contact support" in the landing-page chat
--
-- Until now a request existed only as an email to the support inbox: if the send
-- failed, or the email was missed, the message was gone. Every request is now
-- stored here and listed in the admin portal at /admin/support. The email still
-- goes out; email_sent records whether it did.
--
-- Written and read only with the service-role client (src/actions/support.ts).
-- The form is public and a row holds a visitor's email and chat, so RLS is on
-- with no policies and anon/authenticated hold no table grants at all.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.support_requests (
  id          uuid        primary key default gen_random_uuid(),
  name        text,
  email       text        not null,
  message     text        not null,
  -- The chat that led up to the request, oldest first: [{ role, text }, …]
  transcript  jsonb       not null default '[]'::jsonb,
  status      text        not null default 'open'
    constraint support_requests_status_check check (status in ('open', 'resolved')),
  email_sent  boolean     not null default false,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid        references auth.users(id) on delete set null
);

create index if not exists support_requests_status_created_at_idx
  on public.support_requests (status, created_at desc);

alter table public.support_requests enable row level security;

revoke all on table public.support_requests from public;
revoke all on table public.support_requests from anon;
revoke all on table public.support_requests from authenticated;
grant all on table public.support_requests to service_role;

comment on table public.support_requests is
  'Contact support messages from the landing-page chat; service role only, listed at /admin/support.';
comment on column public.support_requests.email_sent is
  'Whether the notification email to the support inbox was sent. False = only visible in /admin/support.';
