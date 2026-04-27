-- Vehicles table: users register their vehicles to link with transport expenses/bills
create table if not exists vehicles (
  id           uuid        primary key default gen_random_uuid(),
  profile_id   uuid        not null references profiles(id) on delete cascade,
  name         text        not null,
  type         text        not null,
  make         text,
  model        text,
  year         integer,
  plate_number text,
  color        text,
  fuel_type    text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table vehicles enable row level security;

create policy "users can manage own vehicles"
  on vehicles for all
  using  (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

-- Link vehicles to expense entries (optional — only for transport category)
alter table expense_entries
  add column if not exists vehicle_id uuid references vehicles(id) on delete set null;

-- Link vehicles to bills (optional — only for transport category)
alter table bills
  add column if not exists vehicle_id uuid references vehicles(id) on delete set null;
