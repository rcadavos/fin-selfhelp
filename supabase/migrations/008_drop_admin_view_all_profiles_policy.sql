-- Drop "Admins can view all profiles" to fix RLS blocking normal users.
-- The policy used a subquery on the same table (profiles), which can cause
-- recursion/errors when non-admin users update their profile or add expenses.
-- Admin user list uses get_users_for_admin() RPC (SECURITY DEFINER), so this policy is not needed.
drop policy if exists "Admins can view all profiles" on public.profiles;
