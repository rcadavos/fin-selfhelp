-- Generic key/value table for global app-wide settings & feature flags.
-- Each setting is one row; `value` is jsonb so individual flags can evolve
-- from a plain boolean to a richer shape without schema changes.
--
-- First consumer: `ocr_scanning_enabled` — controls the Add Expense receipt
-- scanner. When false, the Scan Receipt button is hidden for all users.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;

-- Any authenticated user can read settings — the client needs the flag to
-- decide whether to render gated UI.
drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

-- No public write policy. Mutations go through server actions that use the
-- service-role client and are guarded by requireAdmin().

-- Seed the OCR flag so the scanner defaults to ON for existing deployments.
insert into public.app_settings (key, value)
values ('ocr_scanning_enabled', 'true'::jsonb)
on conflict (key) do nothing;
