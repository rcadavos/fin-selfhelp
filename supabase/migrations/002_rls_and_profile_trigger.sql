-- One profile per user
create unique index if not exists profiles_user_id_key on public.profiles (user_id);

-- Enable RLS
alter table public.profiles enable row level policy;
alter table public.expense_entries enable row level policy;

-- Profiles: user can read/update only their own (by user_id)
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Expense entries: user can manage entries for their own profile
create policy "Users can view own expense entries"
  on public.expense_entries for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Users can insert own expense entries"
  on public.expense_entries for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Users can update own expense entries"
  on public.expense_entries for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "Users can delete own expense entries"
  on public.expense_entries for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

-- Create profile on first sign up (auth.users insert)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, net_take_home, currency)
  values (new.id, 0, 'PHP');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
