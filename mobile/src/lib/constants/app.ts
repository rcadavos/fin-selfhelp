import Constants from "expo-constants";

/** Display name and version come from app.json so there is one place to change them. */
export const APP_NAME = Constants.expoConfig?.name ?? "OmniTrak";
export const APP_VERSION = Constants.expoConfig?.version ?? "";

/** Web routes the app links out to (paths under `WEB_URL`). */
export const WEB_ROUTES = {
  signup: "/signup",
  forgotPassword: "/forgot-password",
  dashboard: "/dashboard",
  accounts: "/dashboard/accounts",
} as const;

/** Web API routes the app calls with `Authorization: Bearer <access token>`. */
export const WEB_API_ROUTES = {
  mobileSignIn: "/api/auth/mobile-sign-in",
} as const;

/**
 * In-app route that Google and magic-link sign-ins return to. It must be in Supabase's
 * Auth → Redirect URLs: `omnitrak://auth/callback` for builds, `exp://**` for Expo Go.
 */
export const AUTH_CALLBACK_PATH = "auth/callback";
