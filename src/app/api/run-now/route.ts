import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { runAutomationPipeline } from "@/core/pipeline";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAutomationPipeline(user.id);

  // Always return 200 — let the client read result.success
  return NextResponse.json(result, { status: 200 });
}
