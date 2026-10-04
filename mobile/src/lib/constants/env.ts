// Expo inlines EXPO_PUBLIC_* only when read as a literal `process.env.EXPO_PUBLIC_X`.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** The web app's origin — for features the mobile app links out to instead of rebuilding yet. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/+$/, "");
