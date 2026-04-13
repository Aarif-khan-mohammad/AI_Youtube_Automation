import { NextRequest, NextResponse } from "next/server";
import { saveApiKeys } from "@/lib/supabase-actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gemini_api_key, pexels_api_key } = await req.json();

  if (!gemini_api_key || !pexels_api_key) {
    return NextResponse.json({ error: "Both API keys are required" }, { status: 400 });
  }

  await saveApiKeys(gemini_api_key, pexels_api_key);
  return NextResponse.json({ success: true });
}
