"use client";

import type { ReactNode } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { adminFacebookPageQueryOptions, adminSocialSettingsQueryOptions } from "@/lib/query/admin-social";
import { META_ENV, META_SYSTEM_USER_SCOPES } from "@/lib/constants/social";
import { cn } from "@/lib/utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "") ?? "https://<project-ref>.supabase.co";
const SOCIAL_CRON_URL = `${SUPABASE_URL}/functions/v1/send-reminders?job=social`;

function Check({ ok, optional, children }: { ok: boolean; optional?: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-label="Done" />
      ) : (
        <Circle className={cn("mt-0.5 h-4 w-4 shrink-0", optional ? "text-muted-foreground" : "text-amber-500")} aria-label="Not yet" />
      )}
      <span className={cn(!ok && optional && "text-muted-foreground")}>{children}</span>
    </li>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {n}
      </span>
      <div className="min-w-0 space-y-1 pb-2">
        <p className="text-sm font-semibold">{title}</p>
        <div className="space-y-1 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>;
}

/** Connection status, and how to connect the Page with a Meta Business system user. */
export function FacebookSetupGuide() {
  const queryClient = useQueryClient();
  const { data: settings } = useSuspenseQuery(adminSocialSettingsQueryOptions());
  const { data: overview, isFetching } = useSuspenseQuery(adminFacebookPageQueryOptions());

  const test = () => {
    queryClient.invalidateQueries({ queryKey: adminSocialSettingsQueryOptions().queryKey });
    queryClient.invalidateQueries({ queryKey: adminFacebookPageQueryOptions().queryKey });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Connection</CardTitle>
              <CardDescription>Server settings, read from the environment. Values are never shown.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={test} disabled={isFetching} className="gap-1.5">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden />
              Test connection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            <Check ok={settings.pageIdSet}>
              <Code>{META_ENV.pageId}</Code> • the Page&apos;s ID
            </Check>
            <Check ok={settings.tokenSet}>
              <Code>{META_ENV.token}</Code> • the system user&apos;s token
            </Check>
            <Check ok={settings.appSecretSet} optional>
              <Code>{META_ENV.appSecret}</Code> • optional; signs every call so a leaked token alone is useless
            </Check>
            <Check ok={settings.cronSecretSet}>
              <Code>CRON_SECRET</Code> • already used by the reminder crons; the post scheduler uses it too
            </Check>
            <Check ok={settings.aiConfigured} optional>
              <Code>AI_GATEWAY_API_KEY</Code> • optional; turns on AI drafts in Ideas
            </Check>
          </ul>
          <div
            className={cn(
              "rounded-lg p-3 text-sm",
              overview.status === "ok"
                ? "bg-primary/10 text-primary"
                : overview.status === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {overview.status === "ok"
              ? `Connected to ${overview.page.name}. Graph API ${settings.graphApiVersion}.`
              : overview.status === "error"
                ? `Facebook said: ${overview.error}`
                : "Not connected yet. Follow the steps below."}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connect the Page with a system user</CardTitle>
          <CardDescription>
            A system user is a robot account in your Meta Business portfolio. Its token doesn&apos;t expire when someone logs out, changes a password or leaves, which is what a scheduler needs. About 15 minutes, once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <Step n={1} title="Put the Page in a business portfolio">
              <p>
                In <a className="text-primary hover:underline" href="https://business.facebook.com/settings" target="_blank" rel="noreferrer">Business settings <ExternalLink className="inline h-3 w-3" aria-hidden /></a>, go to Accounts • Pages • Add • Add a Page, and add the Page you own. Skip this if it&apos;s there already.
              </p>
            </Step>
            <Step n={2} title="Create a Meta app for the business">
              <p>
                On <a className="text-primary hover:underline" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com <ExternalLink className="inline h-3 w-3" aria-hidden /></a>, create an app with the use case &ldquo;Manage everything on your Page&rdquo; and connect it to the same business portfolio.
              </p>
              <p>
                In App settings • Basic, fill in the privacy policy URL (your /legal pages), an icon and a category, then switch the app to <span className="font-medium text-foreground">Live</span>. Posts made by an app in Development mode can be hidden from everyone without a role on the app.
              </p>
            </Step>
            <Step n={3} title="Create the system user">
              <p>Business settings • Users • System users • Add. Name it after what it does (e.g. &ldquo;Page poster&rdquo;) and give it the Admin role.</p>
            </Step>
            <Step n={4} title="Give it the Page and the app">
              <p>
                With the system user selected, choose Assign assets. Under Pages, pick your Page and turn on full control (at least Content and Manage Page). Under Apps, pick the app from step 2 with full control.
              </p>
            </Step>
            <Step n={5} title="Generate the token">
              <p>
                Choose Generate new token, pick the app, set Token expiration to <span className="font-medium text-foreground">Never</span>, and tick these permissions:
              </p>
              <p className="flex flex-wrap gap-1.5">
                {META_SYSTEM_USER_SCOPES.map((s) => (
                  <Code key={s}>{s}</Code>
                ))}
              </p>
              <p>Copy the token straight away; Meta shows it only once. Treat it like a password.</p>
            </Step>
            <Step n={6} title="Find the Page ID and app secret">
              <p>
                Page ID: on the Page, About • Page transparency, or Business settings • Accounts • Pages. App secret (optional): App settings • Basic. With the secret set here, you can also turn on Require app secret under App settings • Advanced.
              </p>
            </Step>
            <Step n={7} title="Add them to the server">
              <p>In Vercel • Settings • Environment Variables (Production), add these, then redeploy:</p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
                {`${META_ENV.pageId}=1234567890\n${META_ENV.token}=EAAG…\n${META_ENV.appSecret}=abc123…   # optional`}
              </pre>
              <p>Press Test connection above. The Facebook Page tab then shows the live cover and profile picture.</p>
            </Step>
            <Step n={8} title="Turn on the scheduler">
              <p>
                Scheduled posts go out through the same Supabase edge function as timed reminders. Deploy it once with <Code>supabase functions deploy send-reminders</Code>, then add a cron job in Supabase • Integrations • Cron, every 10 minutes (<Code>*/10 * * * *</Code>), sending a POST to:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">{SOCIAL_CRON_URL}</code>
                <CopyButton value={SOCIAL_CRON_URL} />
              </div>
              <p>
                with the header <Code>Authorization: Bearer &lt;FUNCTION_SECRET&gt;</Code>, exactly like the timed reminders job.
              </p>
            </Step>
          </ol>
          <p className="mt-4 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            If Facebook answers with a permissions error (#200 or #10), check that the token has all three permissions and that the system user has the Page with full control. Your own business&apos;s Page normally works with the app&apos;s Standard Access; if Meta still asks, request Advanced Access for pages_manage_posts in App Review.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
