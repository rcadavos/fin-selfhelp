import { queryOptions } from "@tanstack/react-query";
import { getOcrEnabled } from "@/actions/app-settings";
import { queryKeys } from "./keys";

export const ocrEnabledQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.appSettingOcrEnabled(),
    queryFn: () => Promise.resolve().then(() => getOcrEnabled()),
    staleTime: Infinity,
  });
