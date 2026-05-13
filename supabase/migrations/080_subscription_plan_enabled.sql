-- Add an enabled flag to subscription_plan so admins can toggle a plan on/off
-- from /admin/pricing without deleting the row or its history.

alter table public.subscription_plan
  add column if not exists enabled boolean not null default true;

comment on column public.subscription_plan.enabled is
  'When false, the plan is hidden from landing, subscription, and payment pages. Existing subscribers keep access.';
