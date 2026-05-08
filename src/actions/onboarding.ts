"use server";

import { createClient } from "@/lib/supabase/server";
import { createGoal, type GoalType } from "@/actions/goals";

const GOAL_DEFINITIONS: Record<string, { label: string; type: GoalType }> = {
  travel_savings: { label: "Travel savings goal", type: "short_term" },
  emergency_fund: { label: "Build an emergency fund", type: "long_term" },
  house_renovation: { label: "House renovation fund", type: "long_term" },
  mp2_savings: { label: "Build an MP2 savings", type: "lifetime" },
  solar_panel: { label: "Saving for solar panel installation", type: "long_term" },
  vehicle_maintenance: { label: "Vehicle maintenance savings", type: "short_term" },
};

export async function completeOnboarding(params: {
  fullName?: string;
  goals?: string[];
  fixes?: string[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not authenticated." };

  // Persist full name + onboarding flag
  const updates: Record<string, unknown> = { onboarding_complete: true };
  if (params.fullName?.trim()) updates.full_name = params.fullName.trim();
  if (params.fixes?.length) updates.onboarding_fixes = params.fixes;

  const { error } = await supabase.auth.updateUser({ data: updates });
  if (error) return { error: error.message };

  // Create a goal_entry for each selected goal
  if (params.goals?.length) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    await Promise.all(
      params.goals.map((id) => {
        const def = GOAL_DEFINITIONS[id];
        if (!def) return Promise.resolve();
        return createGoal({
          name: def.label,
          date_set_month: month,
          date_set_year: year,
          date_achieved_month: null,
          date_achieved_year: null,
          goal_type: def.type,
          notes: null,
          target_amount: null,
        });
      }),
    );
  }

  return {};
}
