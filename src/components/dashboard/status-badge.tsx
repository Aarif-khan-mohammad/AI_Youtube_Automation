import { Badge } from "@/components/ui/badge";
import type { VideoStatus } from "@/types";

const statusConfig: Record<VideoStatus, { label: string; variant: "pending" | "warning" | "success" | "destructive" | "secondary" }> = {
  pending:    { label: "Pending",    variant: "pending" },
  generating: { label: "Generating", variant: "warning" },
  rendering:  { label: "Rendering",  variant: "warning" },
  uploading:  { label: "Uploading",  variant: "warning" },
  uploaded:   { label: "Uploaded",   variant: "success" },
  failed:     { label: "Failed",     variant: "destructive" },
};

export function StatusBadge({ status }: { status: VideoStatus }) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
