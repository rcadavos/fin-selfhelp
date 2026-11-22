import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PASSWORD_CHECK_AUTH_STORAGE_KEY } from "@/lib/constants/two-factor";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * A browser client whose session lives in memory only: nothing reaches the auth
 * cookies and the app's auth listener never hears about it. The login page checks
 * passwords with it, so a two-step account's session can be withheld until its
 * emailed code is entered. It stays in the browser (rather than a server action) so
 * Supabase keeps rate-limiting sign-ins per visitor, not per server.
 */
export function createPasswordCheckClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: PASSWORD_CHECK_AUTH_STORAGE_KEY,
      },
    }
  );
}
