-- Allow a new pending review after a previous one was rejected (rejected rows stay for admin history).
-- At most one row per author in pending or approved; multiple rejected rows per author are allowed.

drop index if exists public.reviews_author_user_id_unique;

create unique index if not exists reviews_author_user_id_active_unique
  on public.reviews (author_user_id)
  where author_user_id is not null and status in ('pending', 'approved');
