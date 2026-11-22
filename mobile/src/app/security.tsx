import { useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";

import { TwoFactorSettings, TwoFactorSettingsSkeleton } from "@/components/account/two-factor-settings";
import { Screen } from "@/components/app/screen";
import { queryKeys } from "@/lib/query/keys";

export { RouteErrorBoundary as ErrorBoundary } from "@/components/app/route-error-boundary";

export default function SecurityScreen() {
  const queryClient = useQueryClient();

  return (
    <Screen
      title="Security"
      subtitle="Protect password sign-ins with a code sent to your email."
      back
      onRefresh={() => queryClient.refetchQueries({ queryKey: queryKeys.twoFactorStatus() })}
    >
      <Suspense fallback={<TwoFactorSettingsSkeleton />}>
        <TwoFactorSettings />
      </Suspense>
    </Screen>
  );
}
