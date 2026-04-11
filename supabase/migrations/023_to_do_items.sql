-- To-do list (same shape as to_buy_items; separate list per profile)

create table if not exists public.to_do_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  quantity int not null default 1,
  estimated_price text not null default '',
  category text not null default 'grocery',
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  sort_order int not null default 0
);

create index if not exists to_do_items_profile_sort_idx on public.to_do_items (profile_id, sort_order, created_at);

alter table public.to_do_items enable row level security;

create policy "to_do_items_select_owner"
  on public.to_do_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "to_do_items_insert_owner"
  on public.to_do_items for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "to_do_items_update_owner"
  on public.to_do_items for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "to_do_items_delete_owner"
  on public.to_do_items for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );
