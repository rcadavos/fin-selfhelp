import { queryOptions } from "@tanstack/react-query";
import { getUsersForAdmin } from "@/actions/admin";
import { queryKeys } from "./keys";

export const adminUsersQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.adminUsers(),
    queryFn: async () => {
      const { users, error } = await getUsersForAdmin();
      if (error) throw new Error(error);
      return users;
    },
  });
