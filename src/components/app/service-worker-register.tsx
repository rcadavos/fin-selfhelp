"use client";

import { useEffect } from "react";
import { SERVICE_WORKER_PATH, SERVICE_WORKER_SCOPE } from "@/lib/constants/push-notifications";
import { syncThisDeviceSubscription } from "@/lib/push-client";

/**
 * Registers the app service worker in production only (HTTPS), then re-sends this
 * device's push subscription in case the browser renewed it since the last visit.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const { protocol, hostname } = window.location;
    if (protocol !== "https:" && hostname !== "localhost") return;

    void navigator.serviceWorker
      .register(SERVICE_WORKER_PATH, { scope: SERVICE_WORKER_SCOPE })
      .then(() => syncThisDeviceSubscription())
      .catch(() => {
        /* ignore registration errors (e.g. blocked CSP in dev misconfig) */
      });
  }, []);

  return null;
}
