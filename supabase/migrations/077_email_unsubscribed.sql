-- Add email_unsubscribed preference to profiles.
-- Transactional emails (welcome, security, receivable invite) ignore this flag.
-- Broadcast emails and reminder emails must honour it.
alter table public.profiles
  add column if not exists email_unsubscribed boolean not null default false;
