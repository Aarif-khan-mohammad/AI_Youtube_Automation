import { createAdminClient } from "@/lib/supabase-server";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { HistoryTable } from "@/components/dashboard/history-table";
import { RunNowButton } from "@/components/dashboard/run-now-button";
import { PipelineProgress } from "@/components/dashboard/pipeline-progress";
import { Zap } from "lucide-react";

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
        <RunNowButton />
      </div>

      {/* Stats */}
      <StatsCards logs={logs} />

      {/* Pipeline Progress */}
      <PipelineProgress initialLogs={logs} />

      {/* History */}
      <HistoryTable logs={logs} />
    </div>
  );
}
