import { queryOptions } from "@tanstack/react-query";
import { getExpenseCategories } from "@/actions/categories";
import { queryKeys } from "./keys";

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.categories(),
    queryFn: getExpenseCategories,
    staleTime: Infinity,
  });
