-- Per-user in-app notifications (list in header; read state synced)

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

comment on table public.user_notifications is 'In-app notifications; rows inserted by triggers/service; users read/update via RLS.';

alter table public.user_notifications enable row level security;

create policy "user_notifications_select_own"
  on public.user_notifications for select
  using (auth.uid() = user_id);

create policy "user_notifications_update_own"
  on public.user_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Inserts are not granted to authenticated clients (avoid self-spam); use SECURITY DEFINER below.

create or replace function public.create_welcome_user_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    insert into public.user_notifications (user_id, title, body)
    values (
      new.user_id,
      'Welcome to OmniTrak',
      'Reminders and account updates will appear here.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_create_welcome_notification on public.profiles;
create trigger profiles_create_welcome_notification
  after insert on public.profiles
  for each row
  execute function public.create_welcome_user_notification();

-- One welcome row for existing profiles that have none yet
insert into public.user_notifications (user_id, title, body)
select distinct p.user_id,
  'Welcome to OmniTrak',
  'Reminders and account updates will appear here.'
from public.profiles p
where p.user_id is not null
  and not exists (
    select 1 from public.user_notifications n where n.user_id = p.user_id
  );
