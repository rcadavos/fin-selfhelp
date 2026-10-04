import {
  ACCOUNT_SELECT,
  mapAccountRow,
  sumAccountBalances,
  type AccountRow,
} from "@shared/accounts";

import { getProfileId } from "@/lib/api/profile";
import { supabase } from "@/lib/supabase";

// Mobile counterparts of `loadAccounts` / `loadAccountBalances` in the web's
// `src/actions/accounts.ts`; they throw instead of returning `{ error }`.

export async function loadAccounts(): Promise<AccountRow[]> {
  const profileId = await getProfileId();
  if (!profileId) return [];

  const { data, error } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapAccountRow);
}

export async function loadAccountBalances(): Promise<Record<string, number>> {
  const profileId = await getProfileId();
  if (!profileId) return {};

  const [accounts, transactions] = await Promise.all([
    supabase.from("accounts").select("id, starting_balance").eq("profile_id", profileId),
    supabase.from("account_transactions").select("account_id, amount").eq("profile_id", profileId),
  ]);
  if (accounts.error) throw new Error(accounts.error.message);
  if (transactions.error) throw new Error(transactions.error.message);

  return sumAccountBalances(accounts.data ?? [], transactions.data ?? []);
}
