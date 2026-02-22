import { queryOptions } from "@tanstack/react-query";
import type { ExpenseCategory } from "@/types/database.types";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import { queryKeys } from "./keys";

async function fetchCategories(): Promise<ExpenseCategory[]> {
  return Promise.resolve(EXPENSE_CATEGORIES);
}

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
