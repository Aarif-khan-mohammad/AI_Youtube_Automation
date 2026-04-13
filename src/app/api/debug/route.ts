import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  const admin = createAdminClient();

  const { data: users } = await admin.auth.admin.listUsers();
  if (!users.users.length) {
    return NextResponse.json({ error: "No users found — go to /auth and sign up first" });
  }

  const userId = users.users[0].id;
  const userEmail = users.users[0].email;

  const { data: settings, error } = await admin
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  return NextResponse.json({
    userId,
    userEmail,
    settingsFound: !!settings,
    dbError: error?.message ?? null,
    gemini_key_set: !!settings?.gemini_api_key,
    pexels_key_set: !!settings?.pexels_api_key,
    youtube_token_set: !!settings?.youtube_refresh_token,
    auto_upload_enabled: settings?.auto_upload_enabled,
  });
}
