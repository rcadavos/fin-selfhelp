"use client";

import { useEffect } from "react";
import { APP_START_PATH } from "@/lib/constants/pwa";
import { isInstalledApp } from "@/lib/utils/installed-app";

/**
 * Sends installed-app visits of "/" to the dashboard. iOS freezes a Home Screen
 * app's start URL when it is added, so apps installed while the manifest said "/"
 * keep launching here whatever the manifest says now. `replace` keeps the landing
 * page out of the app's history, so a back swipe cannot return to it.
 */
export function InstalledAppRedirect() {
  useEffect(() => {
    if (isInstalledApp()) window.location.replace(APP_START_PATH);
  }, []);

  return null;
}
