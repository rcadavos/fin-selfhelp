import { queryOptions } from "@tanstack/react-query";
import { getExpenseCategoriesForAdmin } from "@/actions/categories";
import { queryKeys } from "./keys";

export const adminCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: [...queryKeys.adminUsers().slice(0, -1), "categories"] as const,
    queryFn: async () => {
      const { categories, error } = await getExpenseCategoriesForAdmin();
      if (error) throw new Error(error);
      return categories;
    },
    staleTime: 30 * 1000,
  });
