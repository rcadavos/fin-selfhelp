-- ─────────────────────────────────────────────────────────────────────────────
-- Lock down SECURITY DEFINER functions that were still executable by PUBLIC,
-- and make subscription payments idempotent per payment intent.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default. A later
-- `grant execute ... to service_role` does NOT remove that default grant, so
-- three SECURITY DEFINER functions were callable by `anon` — i.e. by anyone
-- holding NEXT_PUBLIC_SUPABASE_ANON_KEY, which ships in the browser bundle —
-- straight through PostgREST at POST /rest/v1/rpc/<fn>, with no application
-- code in the path and RLS bypassed by the definer's rights.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. insert_user_notifications_bulk(jsonb) — migration 047.
-- Migration 041 states the intent this broke: "Inserts are not granted to
-- authenticated clients (avoid self-spam); use SECURITY DEFINER below."
-- Unrevoked, anon could inject notifications into any user's bell with
-- attacker-chosen title/body/kind. Only ever called with a service-role client
-- (src/actions/admin.ts, src/actions/notifications.ts).
revoke all on function public.insert_user_notifications_bulk(jsonb) from public;
revoke all on function public.insert_user_notifications_bulk(jsonb) from anon;
revoke all on function public.insert_user_notifications_bulk(jsonb) from authenticated;
grant execute on function public.insert_user_notifications_bulk(jsonb) to service_role;

-- 2. notify_receivable_invite(text,text,text,text) — migration 062.
-- Its comment already claimed "Callable by service role only", but the grant was
-- never paired with a revoke. It returns json_build_object('found', true,
-- 'user_id', v_user_id), making it an unauthenticated
-- email -> account-exists -> auth.users.id oracle. Only called with a
-- service-role client (src/actions/receivables.ts inviteDebtor).
revoke all on function public.notify_receivable_invite(text, text, text, text) from public;
revoke all on function public.notify_receivable_invite(text, text, text, text) from anon;
revoke all on function public.notify_receivable_invite(text, text, text, text) from authenticated;
grant execute on function public.notify_receivable_invite(text, text, text, text) to service_role;

-- 3. profile_id_for_uid(uuid) — migration 025.
-- This one must stay callable by `authenticated`: the account_shares RLS
-- policies in 025 and 035 evaluate it as the invoker. But it took an arbitrary
-- uid, turning any auth uid into the matching profiles.id — the key that every
-- profile_id-scoped row is filtered on.
--
-- Every existing call site passes auth.uid() (025 and 035 policies; nothing in
-- src/ calls it), so pinning it to the caller changes no behaviour while
-- removing the mapping oracle. Kept `language sql` / `stable` so the policies
-- that inline it are unaffected.
create or replace function public.profile_id_for_uid(uid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles
  where user_id = uid
    and uid = auth.uid()
  limit 1;
$$;

comment on function public.profile_id_for_uid(uuid) is
  'Profile id for the CALLING user; returns null for any other uid. SECURITY DEFINER avoids RLS recursion with account_shares policies.';

revoke all on function public.profile_id_for_uid(uuid) from public;
revoke all on function public.profile_id_for_uid(uuid) from anon;
grant execute on function public.profile_id_for_uid(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Replay protection for subscription grants.
--
-- The PayMongo webhook had no idempotency: a replayed delivery for the same
-- payment intent granted another month. saveSubscriptionPaymentReceipt now
-- upserts on this index and reports whether a row was actually inserted, so the
-- grant only runs the first time a payment intent is seen.
--
-- NOTE: this will fail loudly if historical duplicates exist. Find them with:
--   select payment_intent_id, count(*) from public.subscription_payments
--   where payment_intent_id is not null
--   group by payment_intent_id having count(*) > 1;
-- ─────────────────────────────────────────────────────────────────────────────
-- Deliberately NOT a partial index. `on conflict (payment_intent_id) do nothing`
-- cannot infer a partial index without repeating its WHERE clause, which PostgREST
-- has no way to send — the upsert would fail at runtime with "no unique or exclusion
-- constraint matching the ON CONFLICT specification". A plain unique index is
-- equivalent here anyway: Postgres treats NULLs as distinct, so rows with no
-- payment_intent_id (manual/legacy records) are still unlimited.
create unique index if not exists subscription_payments_payment_intent_id_key
  on public.subscription_payments (payment_intent_id);
