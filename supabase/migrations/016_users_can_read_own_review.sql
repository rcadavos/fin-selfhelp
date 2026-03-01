-- Allow logged-in users to view their own review (even if pending/rejected).
-- Public can still only read approved reviews.

create policy "Users can view own reviews"
  on public.reviews for select
  using (author_user_id = auth.uid());

