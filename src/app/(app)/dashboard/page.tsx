import { createAdminClient } from "@/lib/supabase-server";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { HistoryTable } from "@/components/dashboard/history-table";
import { RunNowButton } from "@/components/dashboard/run-now-button";
import { PipelineProgress } from "@/components/dashboard/pipeline-progress";
import { Zap, Settings } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers();
  const userId = users?.users?.[0]?.id ?? "";

  let logs: any[] = [];
  if (userId) {
    const { data } = await admin
      .from("video_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    logs = data ?? [];
  }

  const { data: settings } = await admin
    .from("user_settings")
    .select("youtube_channel_id, auto_upload_enabled, gemini_api_key, youtube_refresh_token")
    .eq("user_id", userId)
    .single();

  const isReady = !!(settings?.gemini_api_key && settings?.youtube_refresh_token);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">WealthFlip</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-10">
            AI-powered YouTube Shorts automation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isReady && (
            <Link href="/settings"
              className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-md px-3 py-1.5 hover:bg-yellow-400/20 transition-colors">
              <Settings className="h-3.5 w-3.5" />
              Setup required
            </Link>
          )}
          <RunNowButton disabled={!isReady} />
        </div>
      </div>

      {/* Not configured warning */}
      {!isReady && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400">
          ⚠️ Pipeline not ready — go to{" "}
          <Link href="/settings" className="underline font-medium">Settings</Link>{" "}
          to connect your API keys and YouTube channel, or hit{" "}
          <a href="/api/debug" target="_blank" className="underline font-medium">/api/debug</a>{" "}
          to auto-configure from environment variables.
        </div>
      )}

      {/* Stats */}
      <StatsCards logs={logs} />

      {/* Pipeline Progress */}
      <PipelineProgress initialLogs={logs} />

      {/* History */}
      <HistoryTable logs={logs} />
    </div>
  );
}
