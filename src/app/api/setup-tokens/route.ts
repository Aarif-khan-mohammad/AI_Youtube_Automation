import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  const admin = createAdminClient();

  const { data: users, error: userError } = await admin.auth.admin.listUsers();
  if (userError || !users.users.length) {
    return NextResponse.json({ error: "No users found. Please sign up first at /auth" }, { status: 400 });
  }

  const userId = users.users[0].id;
  const userEmail = users.users[0].email;

  const { error } = await admin
    .from("user_settings")
    .update({
      youtube_access_token: process.env.YOUTUBE_ACCESS_TOKEN ?? "",
      youtube_refresh_token: process.env.YOUTUBE_REFRESH_TOKEN ?? "",
      youtube_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      youtube_channel_id: process.env.YOUTUBE_CHANNEL_ID ?? "WealthFlip",
      gemini_api_key: process.env.GEMINI_API_KEY ?? "",
      pexels_api_key: process.env.PEXELS_API_KEY ?? "",
      auto_upload_enabled: true,
    })
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `Tokens saved for user: ${userEmail}`, userId });
}
