-- ─────────────────────────────────────────────────────────────────────────────
-- 1. receivables table
--    Tracks money owed to the user by other people (IOUs / loans given out).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.receivables (
  id              uuid        primary key default gen_random_uuid(),
  profile_id      uuid        not null references public.profiles(id) on delete cascade,
  debtor_name     text        not null,
  amount          numeric     not null default 0,
  paid_amount     numeric     not null default 0,
  description     text        not null,
  category        text        not null default 'other'
    constraint receivables_category_check check (
      category in ('loan', 'bill', 'food', 'transport', 'services', 'other')
    ),
  borrowed_date   date,
  due_date        date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint receivables_paid_amount_check check (paid_amount >= 0 and paid_amount <= amount)
);

create trigger receivables_updated_at
  before update on public.receivables
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. receivable_links table
--    Links a receivable to another OmniTrak account via email invitation.
--    The debtor can confirm or reject the link.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.receivable_links (
  id               uuid        primary key default gen_random_uuid(),
  receivable_id    uuid        not null references public.receivables(id) on delete cascade,
  owner_profile_id uuid        not null references public.profiles(id) on delete cascade,
  debtor_email     text        not null,
  debtor_user_id   uuid,
  status           text        not null default 'pending'
    constraint receivable_link_status_check check (
      status in ('pending', 'confirmed', 'rejected', 'cancelled')
    ),
  invite_token     uuid        not null default gen_random_uuid(),
  notes            text,
  invited_at       timestamptz not null default now(),
  confirmed_at     timestamptz,
  unique (receivable_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — receivables
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.receivables enable row level security;

create policy "Users can view own receivables"
  on public.receivables for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can insert own receivables"
  on public.receivables for insert
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can update own receivables"
  on public.receivables for update
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

create policy "Users can delete own receivables"
  on public.receivables for delete
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — receivable_links
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.receivable_links enable row level security;

create policy "Owners can view own receivable links"
  on public.receivable_links for select
  using (
    exists (select 1 from public.profiles p where p.id = owner_profile_id and p.user_id = auth.uid())
  );

create policy "Owners can insert own receivable links"
  on public.receivable_links for insert
  with check (
    exists (select 1 from public.profiles p where p.id = owner_profile_id and p.user_id = auth.uid())
  );

create policy "Owners can update own receivable links"
  on public.receivable_links for update
  using (
    exists (select 1 from public.profiles p where p.id = owner_profile_id and p.user_id = auth.uid())
  );

create policy "Owners can delete own receivable links"
  on public.receivable_links for delete
  using (
    exists (select 1 from public.profiles p where p.id = owner_profile_id and p.user_id = auth.uid())
  );

-- Debtor can view links addressed to their email (pending) or user_id (confirmed)
create policy "Debtors can view their receivable links"
  on public.receivable_links for select
  using (
    debtor_user_id = auth.uid()
    or (
      status = 'pending'
      and debtor_email = (select email from auth.users where id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC — confirm receivable link by token
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.confirm_receivable_link(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link   public.receivable_links%rowtype;
  v_email  text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_link
  from public.receivable_links
  where invite_token = p_token and status = 'pending';

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select email into v_email from auth.users where id = auth.uid();

  if lower(v_email) <> lower(v_link.debtor_email) then
    return json_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  update public.receivable_links
  set status         = 'confirmed',
      debtor_user_id = auth.uid(),
      confirmed_at   = now()
  where id = v_link.id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.confirm_receivable_link(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC — reject receivable link by token
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.reject_receivable_link(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link  public.receivable_links%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_link
  from public.receivable_links
  where invite_token = p_token and status = 'pending';

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select email into v_email from auth.users where id = auth.uid();

  if lower(v_email) <> lower(v_link.debtor_email) then
    return json_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  update public.receivable_links
  set status       = 'rejected',
      confirmed_at = now()
  where id = v_link.id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.reject_receivable_link(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC — get receivable link by token (readable before login for invite page)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_receivable_link_by_token(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link       public.receivable_links%rowtype;
  v_rec        public.receivables%rowtype;
  v_owner_name text;
begin
  select * into v_link
  from public.receivable_links
  where invite_token = p_token;

  if not found then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_rec from public.receivables where id = v_link.receivable_id;

  select coalesce(
    (select raw_user_meta_data->>'full_name'
     from auth.users u
     join public.profiles pr on pr.user_id = u.id
     where pr.id = v_link.owner_profile_id),
    'Someone'
  ) into v_owner_name;

  return json_build_object(
    'ok',                true,
    'link_id',           v_link.id,
    'status',            v_link.status,
    'debtor_email',      v_link.debtor_email,
    'notes',             v_link.notes,
    'receivable_id',     v_rec.id,
    'debtor_name',       v_rec.debtor_name,
    'description',       v_rec.description,
    'amount',            v_rec.amount,
    'category',          v_rec.category,
    'owner_name',        v_owner_name
  );
end;
$$;

grant execute on function public.get_receivable_link_by_token(uuid) to authenticated, anon;
