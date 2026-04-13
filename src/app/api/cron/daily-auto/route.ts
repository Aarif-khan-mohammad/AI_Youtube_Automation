import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { runAutomationPipeline } from "@/core/pipeline";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: users } = await admin
    .from("user_settings")
    .select("user_id")
    .eq("auto_upload_enabled", true)
    .not("youtube_refresh_token", "is", null)
    .not("gemini_api_key", "is", null);

  if (!users || users.length === 0) {
    return NextResponse.json({ message: "No active users to process" });
  }

  const results = await Promise.allSettled(
    users.map((u) => runAutomationPipeline(u.user_id))
  );

  const summary = results.map((r, i) => ({
    userId: users[i].user_id,
    result:
      r.status === "fulfilled"
        ? r.value
        : { success: false, error: String(r.reason) },
  }));

  return NextResponse.json({ processed: users.length, summary });
}
