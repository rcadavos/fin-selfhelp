-- Partner / household sharing: grantor chooses what grantee can view (read-only).

create table if not exists public.account_shares (
  id uuid primary key default gen_random_uuid(),
  grantor_profile_id uuid not null references public.profiles(id) on delete cascade,
  grantee_user_id uuid references auth.users(id) on delete set null,
  invite_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  can_view_expenses boolean not null default false,
  can_view_to_buy boolean not null default false,
  can_view_net_worth boolean not null default false,
  invite_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists account_shares_grantor_idx on public.account_shares (grantor_profile_id);
create index if not exists account_shares_grantee_idx on public.account_shares (grantee_user_id) where grantee_user_id is not null;
create unique index if not exists account_shares_one_pending_per_email
  on public.account_shares (grantor_profile_id, invite_email)
  where status = 'pending';
create unique index if not exists account_shares_one_active_pair
  on public.account_shares (grantor_profile_id, grantee_user_id)
  where status = 'accepted' and grantee_user_id is not null;

-- To-buy list stored per profile (enables sharing + backup)
create table if not exists public.to_buy_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  quantity int not null default 1,
  estimated_price text not null default '',
  category text not null default 'grocery',
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  sort_order int not null default 0
);

create index if not exists to_buy_items_profile_sort_idx on public.to_buy_items (profile_id, sort_order, created_at);

alter table public.account_shares enable row level security;
alter table public.to_buy_items enable row level security;

-- account_shares RLS
create policy "account_shares_select_grantor"
  on public.account_shares for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = grantor_profile_id and p.user_id = auth.uid()
    )
  );

create policy "account_shares_select_grantee"
  on public.account_shares for select
  using (
    (status = 'accepted' and grantee_user_id = auth.uid())
    or (
      status = 'pending'
      and grantee_user_id is null
      and lower(trim(both from invite_email)) = lower(trim(both from (auth.jwt() ->> 'email')))
    )
  );

create policy "account_shares_insert_grantor"
  on public.account_shares for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = grantor_profile_id and p.user_id = auth.uid()
    )
  );

create policy "account_shares_update_grantor"
  on public.account_shares for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = grantor_profile_id and p.user_id = auth.uid()
    )
  );

create policy "account_shares_delete_grantor"
  on public.account_shares for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = grantor_profile_id and p.user_id = auth.uid()
    )
  );

-- Grantees may read grantor profile when an accepted share grants any visibility
create policy "profiles_select_shared_grantee"
  on public.profiles for select
  using (
    exists (
      select 1 from public.account_shares s
      where s.grantor_profile_id = profiles.id
        and s.status = 'accepted'
        and s.grantee_user_id = auth.uid()
        and (s.can_view_expenses or s.can_view_to_buy or s.can_view_net_worth)
    )
  );

-- Expense entries: grantee read-only
create policy "expense_entries_select_shared_grantee"
  on public.expense_entries for select
  using (
    exists (
      select 1 from public.account_shares s
      join public.profiles p on p.id = s.grantor_profile_id
      where expense_entries.profile_id = p.id
        and s.status = 'accepted'
        and s.grantee_user_id = auth.uid()
        and s.can_view_expenses = true
    )
  );

-- Expense payments: grantee read-only
create policy "expense_payments_select_shared_grantee"
  on public.expense_payments for select
  using (
    exists (
      select 1 from public.account_shares s
      join public.profiles p on p.id = s.grantor_profile_id
      where expense_payments.profile_id = p.id
        and s.status = 'accepted'
        and s.grantee_user_id = auth.uid()
        and s.can_view_expenses = true
    )
  );

-- Net worth DB rows: grantee read-only
create policy "net_worth_items_select_shared_grantee"
  on public.net_worth_items for select
  using (
    exists (
      select 1 from public.account_shares s
      join public.profiles p on p.id = s.grantor_profile_id
      where net_worth_items.profile_id = p.id
        and s.status = 'accepted'
        and s.grantee_user_id = auth.uid()
        and s.can_view_net_worth = true
    )
  );

-- to_buy_items: owner full access (mirror expense_entries pattern)
create policy "to_buy_items_select_owner"
  on public.to_buy_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "to_buy_items_insert_owner"
  on public.to_buy_items for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "to_buy_items_update_owner"
  on public.to_buy_items for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "to_buy_items_delete_owner"
  on public.to_buy_items for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  );

create policy "to_buy_items_select_shared_grantee"
  on public.to_buy_items for select
  using (
    exists (
      select 1 from public.account_shares s
      join public.profiles p on p.id = s.grantor_profile_id
      where to_buy_items.profile_id = p.id
        and s.status = 'accepted'
        and s.grantee_user_id = auth.uid()
        and s.can_view_to_buy = true
    )
  );

-- Accept invite: validates email + token (grantee_user_id set here)
create or replace function public.accept_account_share(p_share_id uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  r public.account_shares%rowtype;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_email := lower(trim(auth.jwt() ->> 'email'));
  if v_email is null or length(v_email) = 0 then
    return json_build_object('ok', false, 'error', 'no_email_on_session');
  end if;

  select * into r
  from public.account_shares
  where id = p_share_id
    and invite_token = p_token
    and status = 'pending';

  if r.id is null then
    return json_build_object('ok', false, 'error', 'invalid_or_used_invite');
  end if;

  if lower(trim(r.invite_email)) is distinct from v_email then
    return json_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  update public.account_shares
  set
    status = 'accepted',
    accepted_at = now(),
    grantee_user_id = auth.uid()
  where id = p_share_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.accept_account_share(uuid, uuid) to authenticated;
