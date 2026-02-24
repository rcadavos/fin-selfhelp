-- Store subscription payment records for receipts and history. Saved when PayMongo payment succeeds.
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'PHP',
  description text,
  payment_intent_id text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists subscription_payments_profile_id_idx on public.subscription_payments(profile_id);
create index if not exists subscription_payments_paid_at_idx on public.subscription_payments(paid_at desc);

comment on table public.subscription_payments is 'Payment records for subscription; used for receipts and payment history.';

alter table public.subscription_payments enable row level security;

create policy "Users can view own subscription payments"
  on public.subscription_payments for select
  to authenticated
  using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- Inserts are done server-side with service role when PayMongo payment succeeds (no insert policy for authenticated).
