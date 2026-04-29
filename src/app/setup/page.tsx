import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupWizard } from "@/components/onboarding/setup-wizard";

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <SetupWizard
      initialName={(user.user_metadata?.full_name as string | undefined) ?? ""}
      userId={user.id}
    />
  );
}
