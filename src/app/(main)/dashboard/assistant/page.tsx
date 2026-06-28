import { Suspense } from "react";
import { redirect } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import { getSubscriptionCapabilities } from "@/actions/subscription-capabilities";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { AssistantWorkspace } from "@/components/app/ai/assistant-workspace";
import {
  aiAssistantInfoQueryOptions,
  aiConversationsQueryOptions,
  aiDocumentsQueryOptions,
} from "@/lib/query/ai";

export default async function AssistantPage() {
  const caps = await getSubscriptionCapabilities();
  if (!caps?.hasPremiumAccess) {
    redirect("/account/subscription/payment?plan=premium");
  }

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(aiAssistantInfoQueryOptions()),
    queryClient.prefetchQuery(aiDocumentsQueryOptions()),
    queryClient.prefetchQuery(aiConversationsQueryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground">
            Loading assistant…
          </div>
        }
      >
        <AssistantWorkspace />
      </Suspense>
    </HydrationBoundary>
  );
}
