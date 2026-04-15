"use client";

import { useEffect } from "react";

/** Registers the app service worker in production only (HTTPS). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const { protocol, hostname } = window.location;
    if (protocol !== "https:" && hostname !== "localhost") return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* ignore registration errors (e.g. blocked CSP in dev misconfig) */
      });
  }, []);

  return null;
}
