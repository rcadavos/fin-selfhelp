import { APP_NAME } from "@/lib/constants/app";
import { WEB_URL } from "@/lib/constants/env";

/** `restart`: the flow on the web side is gone (expired, signed out); start it again. */
export type WebApiResult<T> = { ok: true; data: T } | { ok: false; error: string; restart: boolean };

/**
 * POSTs JSON to a web API route (`WEB_API_ROUTES`) and reads the JSON reply. The routes
 * answer errors as `{ error, restart? }` with a 4xx status.
 */
export async function postWebApi<T>(
  path: string,
  options: { accessToken?: string; body?: unknown } = {},
): Promise<WebApiResult<T>> {
  if (!WEB_URL) {
    return { ok: false, error: `Can't reach ${APP_NAME} right now. Please try again later.`, restart: false };
  }

  let response: Response;
  try {
    response = await fetch(`${WEB_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: JSON.stringify(options.body ?? {}),
    });
  } catch {
    return { ok: false, error: `Can't reach ${APP_NAME}. Check your connection and try again.`, restart: false };
  }

  const json = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    return {
      ok: false,
      error: typeof json?.error === "string" ? json.error : "Something went wrong. Please try again.",
      restart: json?.restart === true || response.status === 401,
    };
  }
  return { ok: true, data: json as T };
}
