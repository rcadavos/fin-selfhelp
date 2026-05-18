-- Store the user's birth month (1-12) so we can grant Pro for free during
-- their birth month each year. Nullable: users don't have to set it.
alter table public.profiles
  add column if not exists birth_month smallint
  check (birth_month is null or (birth_month between 1 and 12));

comment on column public.profiles.birth_month is
  'User''s birth month (1 = January … 12 = December). Used to grant a free Pro month each year on the user''s birthday month.';

-- Optional index so we can efficiently look up "all users whose birth month is the current month".
create index if not exists profiles_birth_month_idx
  on public.profiles (birth_month)
  where birth_month is not null;
