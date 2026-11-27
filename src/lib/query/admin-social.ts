import { queryOptions } from "@tanstack/react-query";
import { getFacebookPageOverview, getSocialSettings, listSocialPosts } from "@/actions/social";
import { queryKeys } from "./keys";

export const adminSocialSettingsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.adminSocialSettings(),
    queryFn: () =>
      Promise.resolve().then(async () => {
        const { settings, error } = await getSocialSettings();
        if (!settings) throw new Error(error ?? "Couldn't load the settings.");
        return settings;
      }),
  });

/** Never throws: a Facebook error is part of what the page shows. */
export const adminFacebookPageQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.adminFacebookPage(),
    queryFn: () => Promise.resolve().then(() => getFacebookPageOverview()),
    staleTime: 5 * 60_000,
  });

export const adminSocialPostsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.adminSocialPosts(),
    queryFn: () =>
      Promise.resolve().then(async () => {
        const { posts, error } = await listSocialPosts();
        if (error) throw new Error(error);
        return posts;
      }),
  });
