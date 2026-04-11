-- App preferences (formats, currency, notification toggles) — synced per user
alter table public.profiles
  add column if not exists user_preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.user_preferences is
  'Client preferences: date/time format, currency, language, number grouping, notification toggles. Merged with app defaults when read.';
