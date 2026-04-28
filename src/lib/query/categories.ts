import { queryOptions } from "@tanstack/react-query";
import { getExpenseCategories, getUserCustomCategories } from "@/actions/categories";
import { queryKeys } from "./keys";

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.categories(),
    queryFn: getExpenseCategories,
    staleTime: Infinity,
  });

export const userCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.userCategories(),
    queryFn: getUserCustomCategories,
    staleTime: Infinity,
  });
