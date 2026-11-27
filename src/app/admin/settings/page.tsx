"use client";

import { Suspense, useState } from "react";
import { Loader2, Settings } from "lucide-react";
import { ContentHeader } from "@/components/app/content-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacebookLivePage } from "@/components/admin/settings/facebook-live-page";
import { FacebookBrandAssets } from "@/components/admin/settings/facebook-brand-assets";
import { SocialPostQueue } from "@/components/admin/settings/social-post-queue";
import { SocialPostIdeas } from "@/components/admin/settings/social-post-ideas";
import { FacebookSetupGuide } from "@/components/admin/settings/facebook-setup-guide";
import { SocialPostComposer, type ComposerSeed } from "@/components/admin/settings/social-post-composer";

type Tab = "page" | "posts" | "ideas" | "setup";

function SectionFallback() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("page");
  const [seed, setSeed] = useState<ComposerSeed | null>(null);

  const compose = (next: ComposerSeed) => setSeed(next);
  const openSetup = () => setTab("setup");

  return (
    <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <ContentHeader
        title="Site settings"
        subtitle="The Facebook Page: how it looks, what's posted, and what goes out next."
        icon={Settings}
        className="mb-0"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="page">Facebook Page</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="page" className="space-y-6">
          <Suspense fallback={<SectionFallback />}>
            <FacebookLivePage onOpenSetup={openSetup} />
          </Suspense>
          <FacebookBrandAssets />
        </TabsContent>

        <TabsContent value="posts">
          <Suspense fallback={<SectionFallback />}>
            <SocialPostQueue onCompose={compose} />
          </Suspense>
        </TabsContent>

        <TabsContent value="ideas">
          <Suspense fallback={<SectionFallback />}>
            <SocialPostIdeas
              onCompose={(next) => {
                compose(next);
                setTab("posts");
              }}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="setup">
          <Suspense fallback={<SectionFallback />}>
            <FacebookSetupGuide />
          </Suspense>
        </TabsContent>
      </Tabs>

      <SocialPostComposer seed={seed} onOpenChange={(open) => !open && setSeed(null)} />
    </main>
  );
}
