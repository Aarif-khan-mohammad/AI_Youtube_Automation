import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { runAutomationPipeline } from "@/core/pipeline";

export const maxDuration = 300;

export async function POST() {
  try {
    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers();
    if (!users.users.length) {
      return NextResponse.json({ success: false, error: "No users found. Sign up at /auth first." });
    }
    const userId = users.users[0].id;
    const result = await runAutomationPipeline(userId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) });
  }
}
