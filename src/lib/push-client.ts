"use client";

import {
  deletePushSubscription,
  syncPushSubscription,
  type PushSubscriptionInput,
} from "@/actions/push";
import {
  SERVICE_WORKER_PATH,
  SERVICE_WORKER_SCOPE,
  VAPID_PUBLIC_KEY,
} from "@/lib/constants/push-notifications";

/**
 * Browser side of web push. Everything here touches `navigator`, so call it from
 * effects and event handlers only — never during render.
 */

/**
 * - `supported`: this browser can receive push.
 * - `ios-needs-install`: iPhone or iPad in a Safari tab. Push only exists once the
 *   app is added to the Home Screen and opened from there (iOS 16.4+).
 * - `unsupported`: anything else without the Push API.
 */
export type PushSupport = "supported" | "ios-needs-install" | "unsupported";

function isIosDevice(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; the touch points give it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isInstalledApp(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

export function getPushSupport(): PushSupport {
  const hasPushApi = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (hasPushApi) return "supported";
  return isIosDevice() && !isInstalledApp() ? "ios-needs-install" : "unsupported";
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function toSubscriptionInput(sub: PushSubscription): PushSubscriptionInput {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    userAgent: navigator.userAgent,
  };
}

/** This browser's push subscription, if it has one. Never registers anything. */
export async function getThisDeviceSubscription(): Promise<PushSubscription | null> {
  if (getPushSupport() !== "supported") return null;
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
  return registration ? registration.pushManager.getSubscription() : null;
}

/**
 * Subscribes this browser to push, registering the service worker first if needed
 * (it is only auto-registered in production). Ask for notification permission
 * before calling this — Safari only shows the prompt straight from a tap.
 */
export async function subscribeThisDevice(): Promise<PushSubscription> {
  if (!(await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE))) {
    await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: SERVICE_WORKER_SCOPE });
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

/**
 * Re-sends this device's subscription to the server so a browser-renewed endpoint
 * is not lost. Returns whether push is on for the signed-in user here.
 */
export async function syncThisDeviceSubscription(): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || getPushSupport() !== "supported") return false;
  if (Notification.permission !== "granted") return false;
  const sub = await getThisDeviceSubscription();
  if (!sub) return false;
  const { active } = await syncPushSubscription(toSubscriptionInput(sub));
  return active;
}

/**
 * Turns push off for this device: forgets it server-side and unsubscribes the
 * browser, which kills the endpoint outright. Never throws.
 */
export async function unsubscribeThisDevice(): Promise<void> {
  try {
    const sub = await getThisDeviceSubscription();
    if (!sub) return;
    await Promise.allSettled([deletePushSubscription(sub.endpoint), sub.unsubscribe()]);
  } catch {
    /* best effort — a dead endpoint is also pruned by the next send (404/410) */
  }
}
