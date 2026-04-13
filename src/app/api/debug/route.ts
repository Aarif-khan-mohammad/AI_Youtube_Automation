import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const admin = createAdminClient();

    // 1. List users
    const { data: users, error: userError } = await admin.auth.admin.listUsers();
    if (userError) return NextResponse.json({ step: "listUsers", error: userError.message });
    if (!users.users.length) return NextResponse.json({ error: "No users. Sign up at /auth first." });

    const userId = users.users[0].id;

    // 2. Upsert all credentials from env
    const { error: upsertError } = await admin.from("user_settings").upsert({
      user_id: userId,
      gemini_api_key: process.env.GEMINI_API_KEY ?? "",
      pexels_api_key: process.env.PEXELS_API_KEY ?? "",
      youtube_access_token: process.env.YOUTUBE_ACCESS_TOKEN ?? "",
      youtube_refresh_token: process.env.YOUTUBE_REFRESH_TOKEN ?? "",
      youtube_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      youtube_channel_id: "WealthFlip",
      auto_upload_enabled: true,
    }, { onConflict: "user_id" });

    // 3. Verify
    const { data: s } = await admin.from("user_settings").select("*").eq("user_id", userId).single();

    // 4. Check Python backend
    let pythonStatus = "❌ not running";
    try {
      const r = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(3000) });
      const d = await r.json();
      pythonStatus = d.status === "ok" ? `✅ running — ffmpeg: ${d.ffmpeg}` : "⚠️ " + JSON.stringify(d);
    } catch { pythonStatus = "❌ not running — start with: python -m uvicorn backend.main:app --port 8000 --reload"; }

    return NextResponse.json({
      user: { id: userId, email: users.users[0].email },
      upsertError: upsertError?.message ?? null,
      credentials: {
        gemini:  s?.gemini_api_key  ? "✅ SET" : "❌ MISSING",
        pexels:  s?.pexels_api_key  ? "✅ SET" : "❌ MISSING",
        youtube: s?.youtube_refresh_token ? "✅ SET" : "❌ MISSING",
        channel: s?.youtube_channel_id,
        auto_upload: s?.auto_upload_enabled,
      },
      env: {
        GEMINI_API_KEY:        process.env.GEMINI_API_KEY        ? "✅" : "❌",
        PEXELS_API_KEY:        process.env.PEXELS_API_KEY        ? "✅" : "❌",
        YOUTUBE_REFRESH_TOKEN: process.env.YOUTUBE_REFRESH_TOKEN ? "✅" : "❌",
        SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌",
      },
      python_backend: pythonStatus,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
