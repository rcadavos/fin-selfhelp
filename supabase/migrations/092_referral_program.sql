-- ─────────────────────────────────────────────────────────────────────────────
-- Referral program
--
-- Reward rules (mirrored in src/lib/constants/referral.ts):
--   • Every 5 referred signups grants 1 free month of Pro — stackable, so 10
--     signups grants 2 months, 15 grants 3, and so on.
--   • Every referred friend who upgrades to a paid plan grants 1 more free
--     month of Pro — stackable per upgrade, paid on top of the milestones.
--
-- A "free month" extends profiles.subscription_ends_at by one month and lifts a
-- free account to the 'pro' tier. It deliberately does NOT set is_subscriber,
-- which in this schema means "recurring paid subscriber" — a comped referral
-- month behaves exactly like the signup trial (see 091_new_user_14day_pro_trial).
--
-- Rewards are recorded in public.referral_rewards, which is the idempotency
-- ledger: partial unique indexes make every grant exactly-once, so the grant
-- routine is safe to call repeatedly from triggers, RPCs, and server actions.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles.referral_code — the shareable code behind /r/<code>
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

comment on column public.profiles.referral_code is
  'Uppercase share code behind /r/<code>; generated on demand by public.ensure_referral_code().';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. generate_referral_code() — unambiguous 8-char code, collision-checked
--    Alphabet excludes 0/O/1/I/L so codes stay readable and dictatable.
--    Security definer: the uniqueness probe must see every profile row.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_length   constant int  := 8;
  v_code     text;
  v_attempts int := 0;
begin
  loop
    v_code := '';
    for i in 1..v_length loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    exit when not exists (
      select 1 from public.profiles where referral_code = v_code
    );

    v_attempts := v_attempts + 1;
    if v_attempts > 50 then
      raise exception 'Could not generate a unique referral code';
    end if;
  end loop;

  return v_code;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. referrals — one row per referred account (a user can be referred once)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.referrals (
  id                  uuid        primary key default gen_random_uuid(),
  referrer_profile_id uuid        not null references public.profiles(id) on delete cascade,
  referred_profile_id uuid        not null references public.profiles(id) on delete cascade,
  referral_code       text        not null,
  status              text        not null default 'signed_up'
    constraint referrals_status_check check (status in ('signed_up', 'converted')),
  signed_up_at        timestamptz not null default now(),
  converted_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint referrals_referred_profile_key unique (referred_profile_id),
  constraint referrals_no_self_check check (referrer_profile_id <> referred_profile_id)
);

create index if not exists referrals_referrer_profile_id_idx
  on public.referrals (referrer_profile_id);

create index if not exists referrals_status_idx
  on public.referrals (status);

drop trigger if exists referrals_updated_at on public.referrals;

create trigger referrals_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

comment on table public.referrals is
  'One row per referred account. status flips to converted when the referred user starts paying.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. referral_rewards — the exactly-once ledger of granted free months
--
--    milestone_index is the ordinal of a signup milestone (1 = first 5 signups,
--    2 = the 10th, …). Rewards are never revoked, so a referred account being
--    deleted lowers the signup count without clawing back a granted month and
--    without ever re-granting a milestone that is already on the ledger.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.referral_rewards (
  id              uuid        primary key default gen_random_uuid(),
  profile_id      uuid        not null references public.profiles(id) on delete cascade,
  kind            text        not null
    constraint referral_rewards_kind_check check (kind in ('signup_milestone', 'conversion')),
  months          int         not null default 1
    constraint referral_rewards_months_check check (months > 0),
  milestone_index int,
  referral_id     uuid        references public.referrals(id) on delete set null,
  granted_at      timestamptz not null default now(),
  constraint referral_rewards_shape_check check (
    (kind = 'signup_milestone' and milestone_index is not null)
    or (kind = 'conversion' and milestone_index is null)
  )
);

create index if not exists referral_rewards_profile_id_idx
  on public.referral_rewards (profile_id);

-- One reward per milestone per user.
create unique index if not exists referral_rewards_milestone_key
  on public.referral_rewards (profile_id, milestone_index)
  where kind = 'signup_milestone';

-- One conversion reward per referred account.
create unique index if not exists referral_rewards_conversion_key
  on public.referral_rewards (referral_id)
  where kind = 'conversion';

comment on table public.referral_rewards is
  'Exactly-once ledger of free Pro months granted by the referral program.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS — users read their own referrals and rewards; all writes go via RPC
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.referrals enable row level security;

drop policy if exists "Users can view referrals they made" on public.referrals;
create policy "Users can view referrals they made"
  on public.referrals for select
  using (
    exists (select 1 from public.profiles p where p.id = referrer_profile_id and p.user_id = auth.uid())
  );

drop policy if exists "Users can view the referral that brought them in" on public.referrals;
create policy "Users can view the referral that brought them in"
  on public.referrals for select
  using (
    exists (select 1 from public.profiles p where p.id = referred_profile_id and p.user_id = auth.uid())
  );

alter table public.referral_rewards enable row level security;

drop policy if exists "Users can view own referral rewards" on public.referral_rewards;
create policy "Users can view own referral rewards"
  on public.referral_rewards for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ensure_referral_code() — lazily mint the calling user's code
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select referral_code into v_code
  from public.profiles
  where user_id = auth.uid();

  if v_code is not null then
    return v_code;
  end if;

  -- Retry once on the (vanishingly unlikely) unique-index race.
  for i in 1..3 loop
    begin
      v_code := public.generate_referral_code();
      update public.profiles
      set referral_code = v_code,
          updated_at    = now()
      where user_id = auth.uid();
      return v_code;
    exception when unique_violation then
      v_code := null;
    end;
  end loop;

  raise exception 'Could not assign a referral code';
end;
$$;

grant execute on function public.ensure_referral_code() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. grant_referral_rewards() — award every month the referrer has earned but
--    not yet been given, then extend their Pro window by the total.
--    Idempotent: the partial unique indexes above make each insert exactly-once.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.grant_referral_rewards(p_referrer_profile_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  c_signups_per_reward constant int := 5;
  c_signup_months      constant int := 1;
  c_conversion_months  constant int := 1;
  v_signup_count       int;
  v_milestones_earned  int;
  v_index              int;
  v_referral           record;
  v_granted_months     int := 0;
begin
  if p_referrer_profile_id is null then
    return 0;
  end if;

  select count(*) into v_signup_count
  from public.referrals
  where referrer_profile_id = p_referrer_profile_id;

  v_milestones_earned := v_signup_count / c_signups_per_reward;

  -- Signup milestones: 1 month per full group of 5 referred signups.
  for v_index in 1..greatest(v_milestones_earned, 0) loop
    begin
      insert into public.referral_rewards (profile_id, kind, months, milestone_index)
      values (p_referrer_profile_id, 'signup_milestone', c_signup_months, v_index);
      v_granted_months := v_granted_months + c_signup_months;
    exception when unique_violation then
      -- Already granted for this milestone.
      null;
    end;
  end loop;

  -- Conversions: 1 month per referred friend who started paying.
  for v_referral in
    select r.id
    from public.referrals r
    where r.referrer_profile_id = p_referrer_profile_id
      and r.status = 'converted'
      and not exists (
        select 1 from public.referral_rewards w
        where w.referral_id = r.id and w.kind = 'conversion'
      )
  loop
    begin
      insert into public.referral_rewards (profile_id, kind, months, referral_id)
      values (p_referrer_profile_id, 'conversion', c_conversion_months, v_referral.id);
      v_granted_months := v_granted_months + c_conversion_months;
    exception when unique_violation then
      null;
    end;
  end loop;

  if v_granted_months > 0 then
    update public.profiles
    set
      -- Extend from the later of now and the current end, so unused days are kept.
      subscription_ends_at =
        greatest(now(), coalesce(subscription_ends_at, now()))
        + (v_granted_months || ' months')::interval,
      -- Lift free accounts to Pro; never downgrade an existing Premium member.
      subscription_tier = case when subscription_tier = 'free' then 'pro' else subscription_tier end,
      updated_at = now()
    where id = p_referrer_profile_id;
  end if;

  return v_granted_months;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. attribute_referral() — called once, by the freshly signed-up user
--
--    Guards: code must exist, must not be the caller's own, the caller must not
--    already be attributed, and the account must be young so an established user
--    cannot retro-attribute themselves by clicking a link.
--
--    The window is measured from auth.users.created_at, which is stamped at
--    signup rather than at email confirmation, so it must be wide enough for a
--    friend who signs up, leaves the confirmation email unread for a day or two,
--    then requests a fresh link. Keep in sync with
--    REFERRAL_ATTRIBUTION_WINDOW_DAYS in src/lib/constants/referral.ts.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.attribute_referral(p_code text)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  c_attribution_window constant interval := interval '7 days';
  v_code               text;
  v_referred_profile   uuid;
  v_referrer_profile   uuid;
  v_user_created_at    timestamptz;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_code := upper(trim(coalesce(p_code, '')));
  if v_code = '' then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select id into v_referred_profile
  from public.profiles
  where user_id = auth.uid();

  if v_referred_profile is null then
    return json_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  if exists (select 1 from public.referrals where referred_profile_id = v_referred_profile) then
    return json_build_object('ok', false, 'error', 'already_referred');
  end if;

  select u.created_at into v_user_created_at
  from auth.users u
  where u.id = auth.uid();

  if v_user_created_at is null or v_user_created_at < now() - c_attribution_window then
    return json_build_object('ok', false, 'error', 'attribution_window_passed');
  end if;

  select id into v_referrer_profile
  from public.profiles
  where referral_code = v_code;

  if v_referrer_profile is null then
    return json_build_object('ok', false, 'error', 'code_not_found');
  end if;

  if v_referrer_profile = v_referred_profile then
    return json_build_object('ok', false, 'error', 'self_referral');
  end if;

  begin
    insert into public.referrals (referrer_profile_id, referred_profile_id, referral_code)
    values (v_referrer_profile, v_referred_profile, v_code);
  exception when unique_violation then
    return json_build_object('ok', false, 'error', 'already_referred');
  end;

  perform public.grant_referral_rewards(v_referrer_profile);

  return json_build_object('ok', true, 'referrer_profile_id', v_referrer_profile);
end;
$$;

grant execute on function public.attribute_referral(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. mark_referral_converted() — flip a referral to converted and pay out
--
--    Called by the subscription_payments trigger below (authoritative) and
--    exposed for the server to call after a successful payment. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.mark_referral_converted_for_profile(p_referred_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral record;
begin
  select r.id, r.referrer_profile_id, r.status into v_referral
  from public.referrals r
  where r.referred_profile_id = p_referred_profile_id;

  if not found then
    return false;
  end if;

  if v_referral.status <> 'converted' then
    update public.referrals
    set status       = 'converted',
        converted_at = now()
    where id = v_referral.id;
  end if;

  perform public.grant_referral_rewards(v_referral.referrer_profile_id);

  return true;
end;
$$;

create or replace function public.mark_referral_converted(p_referred_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select id into v_profile_id
  from public.profiles
  where user_id = p_referred_user_id;

  if v_profile_id is null then
    return json_build_object('ok', true, 'converted', false);
  end if;

  return json_build_object(
    'ok', true,
    'converted', public.mark_referral_converted_for_profile(v_profile_id)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9b. Lock down the internal reward machinery
--
--     Postgres grants EXECUTE on new functions to PUBLIC by default, which for
--     Supabase means anon and authenticated can reach them over /rest/v1/rpc.
--     These three are security definer and write subscriptions, so they must not
--     be callable by a signed-in user: mark_referral_converted() takes an
--     arbitrary user id, so an unrevoked grant would let a referrer mark their
--     own friend "converted" and mint a free month without any payment.
--
--     They stay reachable where they are actually needed — from inside other
--     security definer functions and the profiles trigger (which run as the
--     function owner), and from the server via the service role.
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.generate_referral_code() from public, anon, authenticated;
revoke all on function public.grant_referral_rewards(uuid) from public, anon, authenticated;
revoke all on function public.mark_referral_converted(uuid) from public, anon, authenticated;
revoke all on function public.mark_referral_converted_for_profile(uuid) from public, anon, authenticated;

-- src/actions/referrals.ts calls this one with the service-role client.
grant execute on function public.mark_referral_converted(uuid) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Trigger: a recorded payment converts the payer's referral
--
--     The payout must key off something the payer cannot forge. profiles
--     .is_subscriber is the wrong signal: migration 002's "Users can update own
--     profile" policy has no column list, so any signed-in user can PATCH their
--     own is_subscriber to true over /rest/v1 — a referrer could then flip five
--     invited friends and mint five free months without a centavo being paid.
--
--     public.subscription_payments is the trustworthy signal instead: migration
--     011 deliberately gives it no insert policy for authenticated, so rows only
--     arrive from the PayMongo webhook via the service role.
--
--     Reward grants only touch the referrer's subscription_ends_at and
--     subscription_tier — never subscription_payments — so this cannot recurse.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_subscription_payment_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mark_referral_converted_for_profile(new.profile_id);
  return new;
end;
$$;

drop trigger if exists subscription_payments_referral_conversion on public.subscription_payments;

create trigger subscription_payments_referral_conversion
  after insert on public.subscription_payments
  for each row execute function public.handle_subscription_payment_referral();

-- Superseded: an earlier revision of this migration watched profiles.is_subscriber,
-- which the payer can write themselves. Dropped so a partial apply cannot leave it.
drop trigger if exists profiles_referral_conversion on public.profiles;
drop function if exists public.handle_profile_subscription_conversion();

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. mask_email() — 'juan.delacruz@gmail.com' → 'ju***@gmail.com'
--     Referrers see who joined without harvesting full addresses.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.mask_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    else
      left(split_part(p_email, '@', 1), 2)
      || '***@'
      || split_part(p_email, '@', 2)
  end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. get_my_referral_summary() — everything the dashboard page renders
--     Reaches into auth.users for friend names, so emails come back masked.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_my_referral_summary()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile_id uuid;
  v_code       text;
  v_result     json;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select id, referral_code into v_profile_id, v_code
  from public.profiles
  where user_id = auth.uid();

  if v_profile_id is null then
    return json_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  select json_build_object(
    'ok', true,
    'code', v_code,
    'signup_count', (
      select count(*) from public.referrals where referrer_profile_id = v_profile_id
    ),
    'converted_count', (
      select count(*) from public.referrals
      where referrer_profile_id = v_profile_id and status = 'converted'
    ),
    'months_earned', (
      select coalesce(sum(months), 0) from public.referral_rewards where profile_id = v_profile_id
    ),
    'rewards', (
      select coalesce(json_agg(x order by x.granted_at desc), '[]'::json)
      from (
        select w.id, w.kind, w.months, w.milestone_index, w.granted_at
        from public.referral_rewards w
        where w.profile_id = v_profile_id
      ) x
    ),
    'referred', (
      select coalesce(json_agg(y order by y.signed_up_at desc), '[]'::json)
      from (
        select
          r.id,
          r.status,
          r.signed_up_at,
          r.converted_at,
          coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), 'OmniTrak user') as display_name,
          public.mask_email(u.email::text) as masked_email
        from public.referrals r
        join public.profiles p on p.id = r.referred_profile_id
        join auth.users u on u.id = p.user_id
        where r.referrer_profile_id = v_profile_id
      ) y
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_my_referral_summary() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. get_referral_stats_for_admin() — referral counts for the admin portal
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_referral_stats_for_admin()
returns table (
  user_id         uuid,
  email           text,
  full_name       text,
  referral_code   text,
  signup_count    bigint,
  converted_count bigint,
  months_granted  bigint,
  last_referral_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.profiles pr
    where pr.user_id = auth.uid() and pr.is_admin = true
  ) then
    raise exception 'Forbidden: admin only';
  end if;

  return query
  select
    u.id,
    u.email::text,
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    p.referral_code,
    coalesce(counts.signup_count, 0),
    coalesce(counts.converted_count, 0),
    coalesce(rewards.months_granted, 0),
    counts.last_referral_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  left join (
    select
      r.referrer_profile_id,
      count(*)                                              as signup_count,
      count(*) filter (where r.status = 'converted')         as converted_count,
      max(r.signed_up_at)                                    as last_referral_at
    from public.referrals r
    group by r.referrer_profile_id
  ) counts on counts.referrer_profile_id = p.id
  left join (
    select w.profile_id, sum(w.months) as months_granted
    from public.referral_rewards w
    group by w.profile_id
  ) rewards on rewards.profile_id = p.id
  where coalesce(counts.signup_count, 0) > 0
     or coalesce(rewards.months_granted, 0) > 0
  order by coalesce(counts.signup_count, 0) desc, coalesce(rewards.months_granted, 0) desc;
end;
$$;

-- No explicit grant: admin RPCs in this schema rely on the default PUBLIC grant
-- plus the in-body 'Forbidden: admin only' guard (see 033, 043, 057).

-- ─────────────────────────────────────────────────────────────────────────────
-- 13b. referral_invites — durable send log, and the quota that rides on it
--
--      sendReferralInvites() mails arbitrary third parties from our own verified
--      sending domain, so it needs a cumulative cap, not just a per-call one. An
--      in-memory counter would reset on every serverless cold start, so the
--      quota is claimed here: the insert and the count happen in one statement,
--      which also makes it safe against concurrent calls.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.referral_invites (
  id         uuid        primary key default gen_random_uuid(),
  profile_id uuid        not null references public.profiles(id) on delete cascade,
  email      text        not null,
  sent_at    timestamptz not null default now()
);

create index if not exists referral_invites_profile_sent_at_idx
  on public.referral_invites (profile_id, sent_at desc);

comment on table public.referral_invites is
  'Referral invite send log; backs the per-account daily send quota.';

alter table public.referral_invites enable row level security;

drop policy if exists "Users can view own referral invites" on public.referral_invites;
create policy "Users can view own referral invites"
  on public.referral_invites for select
  using (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );

-- Returns the subset of p_emails the caller may send right now, having already
-- logged them. Keep the cap in sync with REFERRAL_MAX_INVITES_PER_DAY.
create or replace function public.claim_referral_invite_quota(p_emails text[])
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c_max_per_day constant int := 25;
  v_profile_id  uuid;
  v_used        int;
  v_allowance   int;
  v_accepted    text[];
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select id into v_profile_id from public.profiles where user_id = auth.uid();
  if v_profile_id is null then
    return json_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  select count(*) into v_used
  from public.referral_invites
  where profile_id = v_profile_id
    and sent_at > now() - interval '24 hours';

  v_allowance := greatest(c_max_per_day - v_used, 0);
  if v_allowance = 0 then
    return json_build_object('ok', false, 'error', 'quota_exceeded', 'accepted', '[]'::json);
  end if;

  with candidates as (
    select distinct lower(trim(e)) as email
    from unnest(coalesce(p_emails, array[]::text[])) as e
    where trim(e) <> ''
  ),
  allowed as (
    select email from candidates order by email limit v_allowance
  ),
  logged as (
    insert into public.referral_invites (profile_id, email)
    select v_profile_id, email from allowed
    returning email
  )
  select coalesce(array_agg(email), array[]::text[]) into v_accepted from logged;

  return json_build_object(
    'ok', true,
    'accepted', to_json(v_accepted),
    'remaining', greatest(v_allowance - coalesce(array_length(v_accepted, 1), 0), 0)
  );
end;
$$;

grant execute on function public.claim_referral_invite_quota(text[]) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. Backfill codes for existing accounts so every user can share right away
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles where referral_code is null loop
    update public.profiles
    set referral_code = public.generate_referral_code()
    where id = v_profile.id;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. New accounts get a referral code at signup, alongside the 14-day trial
--     (keeps 091_new_user_14day_pro_trial's behaviour intact).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, net_take_home, currency, subscription_tier, subscription_ends_at, referral_code)
  values (new.id, 0, 'PHP', 'pro', now() + interval '14 days', public.generate_referral_code());
  return new;
end;
$$ language plpgsql security definer;
