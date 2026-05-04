-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: look up a user_id by email from auth.users (security definer so
-- auth schema is accessible) and, when found, insert an in-app notification.
-- Used by the receivables invite flow to prefer in-app over email for
-- existing OmniTrak accounts.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.notify_receivable_invite(
  p_debtor_email  text,
  p_title         text,
  p_body          text,
  p_dedupe_key    text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- Look up the debtor's user_id by email
  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_debtor_email)
  limit 1;

  if v_user_id is null then
    return json_build_object('found', false);
  end if;

  -- Insert the notification (skip on duplicate dedupe_key)
  insert into public.user_notifications (user_id, title, body, kind, dedupe_key)
  values (v_user_id, p_title, p_body, 'receivable_invite', p_dedupe_key)
  on conflict (user_id, dedupe_key) do nothing;

  return json_build_object('found', true, 'user_id', v_user_id);
end;
$$;

-- Callable by service role only (action uses service role client)
grant execute on function public.notify_receivable_invite(text, text, text, text) to service_role;
