"use server";

import { createClient } from "@/lib/supabase/server";

export type UserStreakData = {
  streak_count: number;
};

export async function touchAndGetStreak(): Promise<UserStreakData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { streak_count: 1 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_count, last_active_date")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return { streak_count: 1 };

  const today = new Date().toISOString().slice(0, 10);
  const last = profile.last_active_date as string | null;

  if (last === today) {
    return { streak_count: (profile.streak_count as number) ?? 1 };
  }

  let newStreak = 1;
  if (last) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    if (last === yesterday.toISOString().slice(0, 10)) {
      newStreak = ((profile.streak_count as number) ?? 1) + 1;
    }
  }

  await supabase
    .from("profiles")
    .update({ streak_count: newStreak, last_active_date: today })
    .eq("user_id", user.id);

  return { streak_count: newStreak };
}
