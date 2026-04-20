import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendGeneratedProReminderEmailsForToday,
  syncGeneratedProNotificationsForToday,
} from "@/actions/notifications";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const notificationResult = await syncGeneratedProNotificationsForToday(supabase, user.id, {
    skipReleaseHourCheck: true,
    includeDebug: true,
  });

  const emailResult = await sendGeneratedProReminderEmailsForToday(user.id, {
    skipReleaseHourCheck: true,
    includeDebug: true,
  });

  return NextResponse.json({ ...notificationResult, emailResult }, { status: 200 });
}
