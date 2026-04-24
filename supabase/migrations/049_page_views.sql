create table if not exists page_views (
  id        bigint generated always as identity primary key,
  path      text        not null default '/',
  visited_at timestamptz not null default now()
);

-- Service role bypasses RLS; enable RLS but grant no public access
-- so only the service-role API route can insert.
alter table page_views enable row level security;
