import { Card, CardContent } from "@/components/ui/card";
import { Video, CheckCircle, AlertCircle, Clock } from "lucide-react";
import type { VideoLog } from "@/types";

export function StatsCards({ logs }: { logs: VideoLog[] }) {
  const total = logs.length;
  const uploaded = logs.filter((l) => l.status === "uploaded").length;
  const failed = logs.filter((l) => l.status === "failed").length;
  const pending = logs.filter((l) =>
    ["pending", "generating", "rendering", "uploading"].includes(l.status)
  ).length;

  const stats = [
    { label: "Total Videos", value: total, icon: Video, color: "text-blue-400" },
    { label: "Uploaded", value: uploaded, icon: CheckCircle, color: "text-emerald-400" },
    { label: "In Progress", value: pending, icon: Clock, color: "text-yellow-400" },
    { label: "Failed", value: failed, icon: AlertCircle, color: "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className={`${color} bg-current/10 rounded-lg p-2 bg-opacity-10`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
