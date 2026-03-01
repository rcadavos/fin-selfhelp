import { queryOptions } from "@tanstack/react-query";
import { getApprovedReviews } from "@/actions/feedback";
import { queryKeys } from "./keys";

export const approvedReviewsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.approvedReviews(),
    queryFn: async () => {
      const result = await getApprovedReviews();
      if (result.error) throw new Error(result.error);
      return result.reviews;
    },
    staleTime: 2 * 60 * 1000,
  });
