import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const admin = createAdminClient();

    // Check env vars
    const envCheck = {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "✅" : "❌ MISSING",
      PEXELS_API_KEY: process.env.PEXELS_API_KEY ? "✅" : "❌ MISSING",
      YOUTUBE_REFRESH_TOKEN: process.env.YOUTUBE_REFRESH_TOKEN ? "✅" : "❌ MISSING",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌ MISSING",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅" : "❌ MISSING",
    };

    // List users
    const { data: users, error: userError } = await admin.auth.admin.listUsers();
    if (userError) return NextResponse.json({ error: userError.message, envCheck });
    if (!users.users.length) return NextResponse.json({ error: "No users — sign up at /auth", envCheck });

    const user = users.users[0];

    // Get settings
    const { data: settings, error: settingsError } = await admin
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Force save keys from env into DB
    const { error: updateError } = await admin
      .from("user_settings")
      .upsert({
        user_id: user.id,
        gemini_api_key: process.env.GEMINI_API_KEY,
        pexels_api_key: process.env.PEXELS_API_KEY,
        youtube_access_token: process.env.YOUTUBE_ACCESS_TOKEN,
        youtube_refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
        youtube_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        youtube_channel_id: "WealthFlip",
        auto_upload_enabled: true,
      }, { onConflict: "user_id" });

    // Verify
    const { data: verified } = await admin
      .from("user_settings")
      .select("gemini_api_key, pexels_api_key, youtube_refresh_token, youtube_channel_id, auto_upload_enabled")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      envCheck,
      user: { id: user.id, email: user.email },
      settingsError: settingsError?.message ?? null,
      updateError: updateError?.message ?? null,
      dbState: {
        gemini_key: verified?.gemini_api_key ? "✅ SET" : "❌ MISSING",
        pexels_key: verified?.pexels_api_key ? "✅ SET" : "❌ MISSING",
        youtube_token: verified?.youtube_refresh_token ? "✅ SET" : "❌ MISSING",
        channel_id: verified?.youtube_channel_id,
        auto_upload: verified?.auto_upload_enabled,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
