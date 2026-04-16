-- Date set: month + year only (drop day-level date_set)

alter table public.goal_entries
  add column if not exists date_set_month smallint,
  add column if not exists date_set_year smallint;

update public.goal_entries
set
  date_set_month = extract(month from date_set)::smallint,
  date_set_year = extract(year from date_set)::smallint
where date_set is not null
  and date_set_month is null;

update public.goal_entries
set
  date_set_month = extract(month from (created_at at time zone 'utc')::date)::smallint,
  date_set_year = extract(year from (created_at at time zone 'utc')::date)::smallint
where date_set_month is null;

alter table public.goal_entries
  alter column date_set_month set not null,
  alter column date_set_year set not null;

alter table public.goal_entries drop column if exists date_set;

alter table public.goal_entries
  add constraint goal_entries_date_set_month_check check (
    date_set_month >= 1 and date_set_month <= 12
  ),
  add constraint goal_entries_date_set_year_check check (
    date_set_year >= 1900 and date_set_year <= 2100
  );

comment on column public.goal_entries.date_set_month is 'Calendar month when the goal was set (1–12).';
comment on column public.goal_entries.date_set_year is 'Calendar year when the goal was set.';
