import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ grantorUserId: string }> };

export default async function SharedHubPage({ params }: Props) {
  const { grantorUserId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/account/shared/${grantorUserId}`)}`);

  const { data: grantorProfile } = await supabase.from("profiles").select("id").eq("user_id", grantorUserId).single();
  if (!grantorProfile) redirect("/account/shared");

  const { data: share } = await supabase
    .from("account_shares")
    .select("can_view_expenses, can_view_to_buy")
    .eq("grantor_profile_id", grantorProfile.id)
    .eq("grantee_user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (!share) redirect("/account/shared");

  return (
    <div className="w-full py-2">
      <Card>
        <CardHeader>
          <CardTitle>Shared account</CardTitle>
          <CardDescription>Choose what to open. You have read-only access.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {share.can_view_expenses && (
            <Button asChild variant="outline">
              <Link href={`/account/shared/${grantorUserId}/expenses`}>Expenses</Link>
            </Button>
          )}
          {share.can_view_to_buy && (
            <Button asChild variant="outline">
              <Link href={`/account/shared/${grantorUserId}/to-buy`}>To-buy list</Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="mt-2">
            <Link href="/account/shared">All shared accounts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
