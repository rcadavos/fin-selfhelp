-- Net worth: assets and liabilities per profile.
-- type: 'asset' | 'liability'
-- category_key: e.g. 'property', 'vehicle', 'loan', 'other'
-- use_type: for vehicles etc. 'business' | 'personal' | null (null for property/house)
create table if not exists public.net_worth_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('asset', 'liability')),
  category_key text not null default 'other',
  name text,
  amount_cents integer not null,
  currency text not null default 'PHP',
  use_type text check (use_type is null or use_type in ('business', 'personal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists net_worth_items_profile_id_idx on public.net_worth_items(profile_id);
create index if not exists net_worth_items_type_idx on public.net_worth_items(profile_id, type);

comment on table public.net_worth_items is 'Assets and liabilities for net worth; category_key e.g. property, vehicle, loan.';
comment on column public.net_worth_items.use_type is 'business = can generate income (asset); personal = liability. Used for vehicles etc.';

alter table public.net_worth_items enable row level security;

create policy "Users can view own net worth items"
  on public.net_worth_items for select
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "Users can insert own net worth items"
  on public.net_worth_items for insert
  to authenticated
  with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "Users can update own net worth items"
  on public.net_worth_items for update
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "Users can delete own net worth items"
  on public.net_worth_items for delete
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create trigger net_worth_items_updated_at
  before update on public.net_worth_items
  for each row
  execute function public.set_updated_at();
