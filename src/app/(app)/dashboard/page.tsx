import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoHistory } from "@/lib/supabase-actions";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { HistoryTable } from "@/components/dashboard/history-table";
import { RunNowButton } from "@/components/dashboard/run-now-button";
import { PipelineProgress } from "@/components/dashboard/pipeline-progress";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const logs = user ? await getVideoHistory(user.id) : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            WealthFlip — AI YouTube automation pipeline
          </p>
        </div>
        <RunNowButton />
      </div>

      {/* Stats */}
      <StatsCards logs={logs} />

      {/* Pipeline Progress — always visible */}
      <PipelineProgress initialLogs={logs} />

      {/* History */}
      <HistoryTable logs={logs} />
    </div>
  );
}
