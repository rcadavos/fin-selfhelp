-- Add generated notification metadata and to-do target dates.

alter table public.user_notifications
  add column if not exists kind text not null default 'system',
  add column if not exists dedupe_key text;

create unique index if not exists user_notifications_user_dedupe_key
  on public.user_notifications (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.to_do_items
  add column if not exists target_date date;

