import { queryOptions } from "@tanstack/react-query";

import { loadTwoFactorStatus } from "@/lib/api/two-factor";
import { queryKeys } from "@/lib/query/keys";

export const twoFactorStatusQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.twoFactorStatus(),
    queryFn: loadTwoFactorStatus,
  });
