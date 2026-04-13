import { NextResponse } from "next/server";
import { getOAuthUrl } from "@/core/youtube/uploader";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = getOAuthUrl();
  return NextResponse.redirect(url);
}
