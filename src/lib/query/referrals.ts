import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  getMyReferralSummary,
  getReferralStatsForAdmin,
  type ReferralSummary,
  type AdminReferralStats,
} from "@/actions/referrals";
import { queryKeys } from "./keys";

/** Current user's referral code, counts, rewards ledger and referred friends. */
export const referralSummaryQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.referralSummary(),
    queryFn: () => Promise.resolve().then(async (): Promise<ReferralSummary | null> => {
      return getMyReferralSummary();
    }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

/** Admin: per-referrer counts plus programme totals. */
export const adminReferralStatsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.adminReferralStats(),
    queryFn: () => Promise.resolve().then(async (): Promise<AdminReferralStats> => {
      const res = await getReferralStatsForAdmin();
      if (res.error) throw new Error(res.error);
      return res.stats;
    }),
    refetchOnWindowFocus: false,
  });

/** Refresh referral views after an invite is sent or a reward is granted. */
export function invalidateReferralQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "referrals"] });
}
