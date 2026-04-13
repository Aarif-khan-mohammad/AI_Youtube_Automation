"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export function RunNowButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleRun() {
    setLoading(true);
    toast({ title: "🚀 Pipeline started!", description: "Watch the progress cards update live..." });
    router.refresh();

    try {
      const res = await fetch("/api/run-now", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        toast({ title: "✅ Video uploaded!", description: data.youtubeUrl ?? "Check YouTube" });
      } else {
        toast({ variant: "destructive", title: "❌ Failed", description: data.error ?? "Unknown error" });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Request failed", description: String(e) });
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <Button onClick={handleRun} disabled={loading} size="lg">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
      {loading ? "Running..." : "Trigger Run Now"}
    </Button>
  );
}
