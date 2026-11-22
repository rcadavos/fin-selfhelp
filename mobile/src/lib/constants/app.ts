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

/**
 * Web API routes the app calls. Most take `Authorization: Bearer <access token>`; the
 * two-step sign-in `verify` and `resend` routes take the `challengeId` instead,
 * because no session exists yet at that point.
 */
export const WEB_API_ROUTES = {
  mobileSignIn: "/api/auth/mobile-sign-in",
  twoFactorSignIn: "/api/auth/two-factor/sign-in",
  twoFactorSignInVerify: "/api/auth/two-factor/sign-in/verify",
  twoFactorSignInResend: "/api/auth/two-factor/sign-in/resend",
  twoFactorSettings: "/api/auth/two-factor/settings",
  twoFactorSettingsConfirm: "/api/auth/two-factor/settings/confirm",
} as const;

/**
 * Storage key for the in-memory client password sign-in checks with. It must differ
 * from the app client's key so the two never share a storage slot or auth lock.
 */
export const PASSWORD_CHECK_AUTH_STORAGE_KEY = "omnitrak-password-check";

/**
 * In-app route that Google and magic-link sign-ins return to. It must be in Supabase's
 * Auth → Redirect URLs: `omnitrak://auth/callback` for builds, `exp://**` for Expo Go.
 */
export const AUTH_CALLBACK_PATH = "auth/callback";
