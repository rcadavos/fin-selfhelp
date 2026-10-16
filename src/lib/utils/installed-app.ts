/**
 * True when the page runs as the installed app (Home Screen app, WebAPK or desktop
 * app window) rather than in a browser tab. Touches `navigator`, so call it from
 * effects and event handlers only — never during render.
 */
export function isInstalledApp(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}
