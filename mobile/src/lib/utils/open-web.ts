import * as WebBrowser from "expo-web-browser";

import { WEB_URL } from "@/lib/constants/env";

/** Opens a page of the web app in an in-app browser sheet. */
export async function openWebPath(path: string): Promise<void> {
  if (!WEB_URL) return;
  await WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);
}
