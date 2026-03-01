-- Enforce: one review per logged-in user (anonymous users can still submit).

alter table public.reviews
  add column if not exists author_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists reviews_author_user_id_unique
  on public.reviews (author_user_id)
  where author_user_id is not null;

-- Tighten insert policy so clients can't spoof author_user_id:
-- - Anonymous inserts must have author_user_id = null
-- - Logged-in inserts must have author_user_id = auth.uid()
drop policy if exists "Anyone can insert reviews" on public.reviews;
create policy "Anyone can insert reviews"
  on public.reviews for insert
  with check (author_user_id is null or author_user_id = auth.uid());

