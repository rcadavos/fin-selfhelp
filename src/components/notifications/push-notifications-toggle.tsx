"use client";

import { useEffect, useId, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { savePushSubscription, sendTestPush } from "@/actions/push";
import { VAPID_PUBLIC_KEY } from "@/lib/constants/push-notifications";
import {
  getPushSupport,
  getThisDeviceSubscription,
  subscribeThisDevice,
  syncThisDeviceSubscription,
  toSubscriptionInput,
  unsubscribeThisDevice,
} from "@/lib/push-client";
import { cn } from "@/lib/utils";

type PushState =
  | "checking"
  | "on"
  | "off"
  | "blocked"
  | "ios-needs-install"
  | "unsupported"
  | "not-configured";

const DESCRIPTIONS: Record<PushState, string> = {
  checking: "Checking this device…",
  on: "Bill reminders pop up here at about 8:00 AM, even when OmniTrak is closed.",
  off: "Get bill reminders as a notification on this phone or computer, even when OmniTrak is closed.",
  blocked:
    "Notifications are blocked for OmniTrak in this browser. Allow them in your browser or phone settings, then come back here.",
  "ios-needs-install":
    "On iPhone and iPad, add OmniTrak to your Home Screen first: tap Share, then Add to Home Screen. Open it from there and turn this on.",
  unsupported: "This browser can't receive push notifications. Chrome, Edge, Firefox and Safari can.",
  "not-configured": "Push notifications aren't available yet.",
};

async function readPushState(): Promise<PushState> {
  const support = getPushSupport();
  if (support !== "supported") return support;
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (Notification.permission === "denied") return "blocked";
  return (await syncThisDeviceSubscription()) ? "on" : "off";
}

/**
 * Per-device switch for reminder push notifications. Push is a property of the
 * browser, not the account, so the state is read from the device on mount.
 */
export function PushNotificationsToggle({ className }: { className?: string }) {
  const labelId = useId();
  const { showError, showSuccess } = useSnackbar();
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState<"toggle" | "test" | null>(null);

  useEffect(() => {
    let cancelled = false;
    readPushState()
      .catch((): PushState => "off")
      .then((next) => {
        if (!cancelled) setState(next);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const turnOn = async () => {
    // Ask first, straight from the tap: Safari ignores a prompt that comes later.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "blocked" : "off");
      return;
    }
    const sub = await subscribeThisDevice();
    const res = await savePushSubscription(toSubscriptionInput(sub));
    if (res.error) throw new Error(res.error);
    setState("on");
    showSuccess("Push notifications are on for this device.");
  };

  const turnOff = async () => {
    await unsubscribeThisDevice();
    setState("off");
    showSuccess("Push notifications are off for this device.");
  };

  const onToggle = async (next: boolean) => {
    setBusy("toggle");
    try {
      await (next ? turnOn() : turnOff());
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not change push notifications.");
    } finally {
      setBusy(null);
    }
  };

  const onTest = async () => {
    setBusy("test");
    try {
      const sub = await getThisDeviceSubscription();
      const res = await sendTestPush(sub?.endpoint ?? "");
      if (res.error) showError(res.error);
      else showSuccess("Test sent. It should appear in a few seconds.");
    } finally {
      setBusy(null);
    }
  };

  const canToggle = state === "on" || state === "off";

  return (
    <div className={cn("surface border p-4 space-y-3", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 pr-2">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" aria-hidden />
            <p id={labelId} className="text-sm font-medium">
              Push notifications on this device
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{DESCRIPTIONS[state]}</p>
        </div>
        <ToggleSwitch
          checked={state === "on"}
          disabled={!canToggle || busy !== null}
          onCheckedChange={(next) => void onToggle(next)}
          aria-labelledby={labelId}
        />
      </div>
      {state === "on" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => void onTest()}
          disabled={busy !== null}
        >
          {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {busy === "test" ? "Sending…" : "Send a test"}
        </Button>
      ) : null}
    </div>
  );
}
