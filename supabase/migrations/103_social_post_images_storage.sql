-- Photos for Facebook posts, uploaded from the composer in /admin/settings.
--
-- Public, because Facebook fetches each photo from its public address when the
-- post goes out. There are deliberately no insert, update or delete policies:
-- an admin-checked server action hands out a one-time signed upload URL, and
-- removals go through the service role.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'social-post-images',
  'social-post-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/gif']::text[]
where not exists (select 1 from storage.buckets where id = 'social-post-images');
