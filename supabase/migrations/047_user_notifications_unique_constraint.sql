-- Add unique constraint for user_notifications dedupe_key to support ON CONFLICT.

drop index if exists public.user_notifications_user_dedupe_key;

alter table public.user_notifications
  add constraint user_notifications_user_dedupe_key
  unique (user_id, dedupe_key);

-- Function to insert notifications with conflict handling
create or replace function public.insert_user_notifications_bulk(notifications jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_notifications (user_id, title, body, kind, dedupe_key)
  select
    (n->>'user_id')::uuid,
    n->>'title',
    n->>'body',
    n->>'kind',
    n->>'dedupe_key'
  from jsonb_array_elements(notifications) as n
  on conflict (user_id, dedupe_key) do nothing;
end;
$$;