-- Subscription plan (single row). Admin can update price; app reads for payment/landing.
create table if not exists public.subscription_plan (
  id text primary key default 'default',
  name text not null default 'Pro',
  price_amount numeric(10, 2) not null default 3,
  price_currency text not null default 'USD',
  interval text not null default 'month',
  original_price_amount numeric(10, 2),
  updated_at timestamptz not null default now()
);

comment on table public.subscription_plan is 'Single subscription plan; admin can change price. App uses for payment and landing.';

alter table public.subscription_plan enable row level security;

-- Anyone (including anon) can read so landing and payment pages can show price
create policy "Anyone can view subscription plan"
  on public.subscription_plan for select
  to anon, authenticated
  using (true);

-- Only admins can update
create policy "Admins can update subscription plan"
  on public.subscription_plan for update
  to authenticated
  using (
    exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
  );

create policy "Admins can insert subscription plan"
  on public.subscription_plan for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
  );

create trigger subscription_plan_updated_at
  before update on public.subscription_plan
  for each row execute function public.set_updated_at();

-- Seed single row
insert into public.subscription_plan (id, name, price_amount, price_currency, interval, original_price_amount)
values ('default', 'Pro', 3, 'USD', 'month', 20)
on conflict (id) do nothing;
