-- Facebook Page posts written in /admin/settings. Drafts wait; scheduled posts are
-- published by /api/cron/social-posts once `scheduled_for` passes; "Publish now"
-- posts straight away.
--
-- Admin only: RLS is on with no policies, so only the service-role client (server
-- actions guarded by profiles.is_admin, and the cron) can read or write it.

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'facebook' check (platform in ('facebook')),
  message text not null check (char_length(message) between 1 and 5000),
  link text,
  image_url text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_for timestamptz,
  published_at timestamptz,
  -- Facebook's post id ({page-id}_{post-id}) and its public link, once published.
  external_post_id text,
  permalink_url text,
  error text,
  attempts integer not null default 0,
  -- Which idea-bank theme it came from (seasonal, tips, feature …), for a balanced mix.
  pillar text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_scheduled_has_time check (status <> 'scheduled' or scheduled_for is not null)
);

-- The cron's lookup: scheduled posts whose time has come, oldest first.
create index if not exists social_posts_due_idx
  on public.social_posts (scheduled_for)
  where status = 'scheduled';

alter table public.social_posts enable row level security;
-- Belt and braces: no policy already blocks them, and without the grant a
-- policy added by mistake later still couldn't expose the table.
revoke all on table public.social_posts from anon, authenticated;

-- Auto-publish defaults to on: scheduling a post is already the decision to post it.
-- Turning it off in /admin/settings pauses the cron without touching the queue.
insert into public.app_settings (key, value)
values ('social_autopublish_enabled', 'true'::jsonb)
on conflict (key) do nothing;
