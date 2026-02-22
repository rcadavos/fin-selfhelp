export const queryKeys = {
  all: ["fin-selfhelp"] as const,
  categories: () => [...queryKeys.all, "categories"] as const,
};
