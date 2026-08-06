"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Gift, Sparkles, Trophy, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ContentHeader } from "@/components/app/content-header";
import { Stamp } from "@/components/passbook/stamp";
import { LedgerRow } from "@/components/passbook/dot-leader";
import { ReferralShareCard } from "@/components/dashboard/referral-share-card";
import { referralSummaryQueryOptions, invalidateReferralQueries } from "@/lib/query/referrals";
import {
  REFERRAL_HEADLINE,
  REFERRAL_REWARD_KIND_LABELS,
  REFERRAL_RULES,
  REFERRAL_SIGNUPS_PER_REWARD,
  REFERRAL_TAGLINE,
  referralMilestoneProgress,
  referralsUntilNextReward,
} from "@/lib/constants/referral";
import type { ReferralRewardRow, ReferredFriendRow } from "@/actions/referrals";

/**
 * Explicit locale AND time zone: this board is SSR-prefetched, so a UTC server
 * and a UTC+8 browser would otherwise format a late-evening timestamp as two
 * different days and trip a hydration mismatch.
 */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function StatCell({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <span className="figure text-2xl text-foreground sm:text-[1.7rem]">{value}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

function RewardsLedger({ rewards }: { rewards: ReferralRewardRow[] }) {
  if (rewards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No free months yet. Your first reward lands as soon as {REFERRAL_SIGNUPS_PER_REWARD} friends
        join — or the moment one of them upgrades to Pro.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rewards.map((reward) => (
        <li key={reward.id} className="py-3 text-sm">
          <LedgerRow
            label={
              <span className="text-foreground">
                {REFERRAL_REWARD_KIND_LABELS[reward.kind]}
                {reward.kind === "signup_milestone" && reward.milestoneIndex
                  ? ` • milestone ${reward.milestoneIndex}`
                  : ""}
              </span>
            }
          >
            <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
              {formatDate(reward.grantedAt)}
            </span>
          </LedgerRow>
          <p className="mt-0.5 text-xs text-primary">
            +{reward.months} {reward.months === 1 ? "month" : "months"} of Pro
          </p>
        </li>
      ))}
    </ul>
  );
}

function FriendsList({ referred }: { referred: ReferredFriendRow[] }) {
  if (referred.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          No one has joined through your link yet. Share it above and they will show up here the
          moment they confirm their account.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {referred.map((friend) => (
        <li key={friend.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{friend.displayName}</p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {friend.maskedEmail ?? "—"} • joined {formatDate(friend.signedUpAt)}
            </p>
          </div>
          {friend.status === "converted" ? (
            <Stamp variant="paid">Upgraded</Stamp>
          ) : (
            <Stamp variant="muted">Joined</Stamp>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ReferralsBoard() {
  const queryClient = useQueryClient();
  const { data: summary } = useSuspenseQuery(referralSummaryQueryOptions());

  const refresh = useCallback(() => {
    invalidateReferralQueries(queryClient);
  }, [queryClient]);

  if (!summary) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <ContentHeader
          title={REFERRAL_HEADLINE}
          subtitle="Sign in to get your invite link."
          icon={Gift}
        />
        <Card>
          <CardContent className="py-8">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const remaining = referralsUntilNextReward(summary.signupCount);
  const progress = referralMilestoneProgress(summary.signupCount);
  const towardNext = summary.signupCount % REFERRAL_SIGNUPS_PER_REWARD;

  return (
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
      <ContentHeader title={REFERRAL_HEADLINE} subtitle={REFERRAL_TAGLINE} icon={Gift} />

      {/* ── Counts ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-border">
        <StatCell
          icon={Users}
          label="Friends joined"
          value={summary.signupCount}
          hint={`${REFERRAL_SIGNUPS_PER_REWARD} joins = 1 free month`}
        />
        <StatCell
          icon={Sparkles}
          label="Upgraded to Pro"
          value={summary.convertedCount}
          hint="Each upgrade = 1 free month"
        />
        <StatCell
          icon={Trophy}
          label="Free months earned"
          value={summary.monthsEarned}
          hint="Already added to your Pro window"
        />
      </div>

      {/* ── Progress to next reward ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Next free month</CardTitle>
          <CardDescription>
            {remaining === REFERRAL_SIGNUPS_PER_REWARD && summary.signupCount === 0
              ? `Invite ${REFERRAL_SIGNUPS_PER_REWARD} friends to earn your first free month of Pro.`
              : `${remaining} more ${remaining === 1 ? "friend" : "friends"} and you earn another free month of Pro.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-foreground">
                {towardNext} of {REFERRAL_SIGNUPS_PER_REWARD} friends
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress
              current={towardNext}
              target={REFERRAL_SIGNUPS_PER_REWARD}
              size="md"
              label={`${towardNext} of ${REFERRAL_SIGNUPS_PER_REWARD} friends joined`}
            />
          </div>

          <ul className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            {REFERRAL_RULES.map((rule) => (
              <li key={rule.metric} className="flex gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {rule.metric} → {rule.reward}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rule.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── Share ────────────────────────────────────────────────────────────── */}
      <ReferralShareCard code={summary.code} link={summary.link} onInvitesSent={refresh} />

      {/* ── Friends + rewards ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Friends you invited</CardTitle>
            <CardDescription>
              {summary.signupCount === 0
                ? "Nobody yet."
                : `${summary.signupCount} joined • ${summary.convertedCount} upgraded to Pro`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FriendsList referred={summary.referred} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Free months earned</CardTitle>
            <CardDescription>
              Every reward extends your Pro access from whenever it currently ends.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RewardsLedger rewards={summary.rewards} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
