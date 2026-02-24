-- Manageable expense categories (admin CRUD). App reads from here.
create table if not exists public.expense_categories (
  id text primary key,
  label text not null,
  bg_class text not null default '',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.expense_categories is 'Expense categories; manageable by admin. App uses this list for dropdowns and labels.';

alter table public.expense_categories enable row level security;

-- All authenticated users can read categories
create policy "Anyone authenticated can view expense categories"
  on public.expense_categories for select
  to authenticated
  using (true);

-- Only admins can insert/update/delete
create policy "Admins can insert expense categories"
  on public.expense_categories for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
  );

create policy "Admins can update expense categories"
  on public.expense_categories for update
  to authenticated
  using (
    exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
  );

create policy "Admins can delete expense categories"
  on public.expense_categories for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
  );

create trigger expense_categories_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

-- Seed with current categories (same as in code)
insert into public.expense_categories (id, label, bg_class, sort_order) values
  ('grocery', 'Grocery', 'bg-amber-50 dark:bg-amber-950/30', 1),
  ('transport', 'Transport & Commute', 'bg-sky-50 dark:bg-sky-950/30', 2),
  ('utilities', 'Utilities (Electric, Water, Internet)', 'bg-slate-50 dark:bg-slate-800/30', 3),
  ('insurance', 'Insurance', 'bg-emerald-50 dark:bg-emerald-950/30', 4),
  ('loans', 'Loans & Debts', 'bg-rose-50 dark:bg-rose-950/30', 5),
  ('savings', 'Savings & Investments', 'bg-green-50 dark:bg-green-950/30', 6),
  ('rent', 'Rent / Mortgage', 'bg-violet-50 dark:bg-violet-950/30', 7),
  ('food_dining', 'Food & Dining Out', 'bg-orange-50 dark:bg-orange-950/30', 8),
  ('health', 'Health & Medical', 'bg-teal-50 dark:bg-teal-950/30', 9),
  ('education', 'Education', 'bg-indigo-50 dark:bg-indigo-950/30', 10),
  ('personal', 'Personal & Grooming', 'bg-pink-50 dark:bg-pink-950/30', 11),
  ('credit_card', 'Credit Card', 'bg-cyan-50 dark:bg-cyan-950/30', 12),
  ('gaming', 'Gaming Expenses', 'bg-fuchsia-50 dark:bg-fuchsia-950/30', 13),
  ('home_maintenance', 'Home Maintenance', 'bg-lime-50 dark:bg-lime-950/30', 14),
  ('subscription', 'Subscription', 'bg-blue-50 dark:bg-blue-950/30', 15),
  ('other', 'Other', 'bg-neutral-50 dark:bg-neutral-800/30', 16)
on conflict (id) do nothing;
