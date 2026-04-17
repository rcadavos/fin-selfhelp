create table if not exists public.reminder_email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dedupe_key text not null,
  sent_at timestamptz not null default now(),
  channel text not null default 'email'
);

create unique index if not exists reminder_email_logs_user_dedupe_idx
  on public.reminder_email_logs (user_id, dedupe_key);

create index if not exists reminder_email_logs_user_sent_at_idx
  on public.reminder_email_logs (user_id, sent_at desc);

alter table public.reminder_email_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reminder_email_logs'
      and policyname = 'Users can read own reminder email logs'
  ) then
    create policy "Users can read own reminder email logs"
      on public.reminder_email_logs
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;
