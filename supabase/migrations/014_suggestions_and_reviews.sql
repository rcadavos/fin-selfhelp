-- Suggestions: anyone can submit; only admins read (via service role or admin RPC)
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  email text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.suggestions enable row level security;

-- Anyone (including anonymous) can insert a suggestion
create policy "Anyone can insert suggestions"
  on public.suggestions for insert
  with check (true);

-- No public select; admins will use service role or a secure function to list suggestions

comment on table public.suggestions is 'User suggestions from footer; only admins can read.';

-- Reviews: anyone can submit; public can read approved only; admins can list all and approve/reject
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text,
  content text not null,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.reviews enable row level security;

-- Anyone can insert a review
create policy "Anyone can insert reviews"
  on public.reviews for insert
  with check (true);

-- Anyone can read approved reviews (for landing page)
create policy "Public can read approved reviews"
  on public.reviews for select
  using (status = 'approved');

-- Admins can read all reviews
create policy "Admins can view all reviews"
  on public.reviews for select
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.is_admin = true
    )
  );

-- Admins can update reviews (e.g. set status to approved/rejected)
create policy "Admins can update reviews"
  on public.reviews for update
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.is_admin = true
    )
  );

comment on table public.reviews is 'User reviews; shown on landing page after admin approval.';

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();
