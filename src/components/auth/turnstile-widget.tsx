"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTheme } from "next-themes";
import { forwardRef, useImperativeHandle, useRef } from "react";

// Cloudflare-provided "always passes" test key — used when the real site key
// is not configured (local dev, preview deploys) so auth flows still work.
const TEST_SITE_KEY = "1x00000000000000000000AA";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || TEST_SITE_KEY;

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  action?: string;
  className?: string;
};

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onSuccess, onExpire, onError, action, className }, ref) {
    const { resolvedTheme } = useTheme();
    const instanceRef = useRef<TurnstileInstance | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => instanceRef.current?.reset(),
    }));

    return (
      <div className={className}>
        <Turnstile
          ref={instanceRef}
          siteKey={SITE_KEY}
          onSuccess={onSuccess}
          onExpire={onExpire}
          onError={onError}
          options={{
            theme: resolvedTheme === "dark" ? "dark" : "light",
            size: "flexible",
            action,
          }}
        />
      </div>
    );
  }
);
