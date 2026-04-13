import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers();
    if (!users.users.length) return NextResponse.json({ logs: [] });

    const userId = users.users[0].id;
    const { data: logs } = await admin
      .from("video_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ logs: logs ?? [] });
  } catch (e) {
    return NextResponse.json({ logs: [], error: String(e) });
  }
}
