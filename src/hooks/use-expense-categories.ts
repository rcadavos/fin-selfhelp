"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { categoriesQueryOptions } from "@/lib/query/categories";

export function useExpenseCategories() {
  return useSuspenseQuery(categoriesQueryOptions());
}
