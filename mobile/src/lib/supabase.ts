import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/constants/env";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are not set — copy mobile/.env.example to mobile/.env.",
  );
}

/**
 * The app talks to Supabase directly with the user's session, so Row Level Security is
 * what keeps each user to their own rows — the same policies the web's browser client
 * relies on. Anything that needs the service-role key belongs behind a web API route.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Google and magic-link sign-ins come back by deep link with a one-time `code`
    // that only this install can redeem, because the verifier never leaves the device.
    flowType: "pkce",
  },
});

// A native app has no tab-visibility signal, so only refresh the token while foregrounded.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
