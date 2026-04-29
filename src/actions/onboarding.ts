"use server";

import { createClient } from "@/lib/supabase/server";
import { createGoal, type GoalType } from "@/actions/goals";

const GOAL_DEFINITIONS: Record<string, { label: string; type: GoalType }> = {
  save_money:      { label: "Save more money",           type: "long_term" },
  emergency_fund:  { label: "Build an emergency fund",   type: "short_term" },
  pay_debt:        { label: "Pay off debt",               type: "long_term" },
  budget:          { label: "Stick to a budget",          type: "short_term" },
  plan_future:     { label: "Plan for the future",        type: "lifetime" },
  track_expenses:  { label: "Track all my expenses",      type: "short_term" },
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
        });
      }),
    );
  }

  return {};
}
