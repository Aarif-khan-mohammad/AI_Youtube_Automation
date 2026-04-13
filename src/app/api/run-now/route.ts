import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { runAutomationPipeline } from "@/core/pipeline";

export const maxDuration = 300;

export async function POST() {
  try {
    const admin = createAdminClient();

    // Get first user
    const { data: users, error: userError } = await admin.auth.admin.listUsers();
    if (userError) return NextResponse.json({ success: false, error: userError.message });
    if (!users.users.length) return NextResponse.json({ success: false, error: "No users found. Sign up at /auth first." });

    const userId = users.users[0].id;

    // Ensure user_settings row exists
    await admin.from("user_settings").upsert({
      user_id: userId,
      gemini_api_key: process.env.GEMINI_API_KEY,
      pexels_api_key: process.env.PEXELS_API_KEY,
      youtube_access_token: process.env.YOUTUBE_ACCESS_TOKEN,
      youtube_refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      youtube_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      youtube_channel_id: "WealthFlip",
      auto_upload_enabled: true,
    }, { onConflict: "user_id" });

    const result = await runAutomationPipeline(userId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) });
  }
}
