import {
  isEmailTwoFactorEnabled,
  type TwoFactorCodeSent,
  type TwoFactorSettingsPurpose,
} from "@shared/two-factor";

import { postWebApi, type WebApiResult } from "@/lib/api/web";
import { WEB_API_ROUTES } from "@/lib/constants/app";
import { supabase } from "@/lib/supabase";

export type TwoFactorStatus = {
  enabled: boolean;
  /** False for accounts that only sign in with Google (no password yet). */
  hasEmailPassword: boolean;
};

/**
 * Read from the auth server rather than the stored session: the session's copy of
 * app_metadata is only as fresh as its last token refresh, and the setting may have
 * been changed on the web since.
 */
export async function loadTwoFactorStatus(): Promise<TwoFactorStatus> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return {
    enabled: isEmailTwoFactorEnabled(data.user),
    hasEmailPassword: (data.user.identities ?? []).some((identity) => identity.provider === "email"),
  };
}

async function accessToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

/** Emails the code that confirms turning two-step verification on or off. */
export async function sendTwoFactorSettingsCode(
  purpose: TwoFactorSettingsPurpose,
): Promise<WebApiResult<TwoFactorCodeSent>> {
  return postWebApi<TwoFactorCodeSent>(WEB_API_ROUTES.twoFactorSettings, {
    accessToken: await accessToken(),
    body: { purpose },
  });
}

/** Checks the settings code; the web then turns the feature on or off. */
export async function confirmTwoFactorSettings(
  purpose: TwoFactorSettingsPurpose,
  code: string,
): Promise<WebApiResult<{ enabled: boolean }>> {
  return postWebApi<{ enabled: boolean }>(WEB_API_ROUTES.twoFactorSettingsConfirm, {
    accessToken: await accessToken(),
    body: { purpose, code },
  });
}
