"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Brain, Mic, Film, Video, Upload, Youtube,
  CheckCircle, Circle, Loader2, XCircle, AlertTriangle,
} from "lucide-react";
import type { VideoLog, VideoStatus } from "@/types";
import { timeAgo } from "@/lib/utils";

const STEPS = [
  { label: "Fetching Trending Niche",    icon: TrendingUp, activeOn: ["pending"] },
  { label: "Generating Script (Gemini)", icon: Brain,      activeOn: ["generating"] },
  { label: "Generating Voiceover (TTS)", icon: Mic,        activeOn: ["rendering"] },
  { label: "Fetching Stock Footage",     icon: Film,       activeOn: ["rendering"] },
  { label: "Rendering Video (FFmpeg)",   icon: Video,      activeOn: ["rendering"] },
  { label: "Uploading to Storage",       icon: Upload,     activeOn: ["uploading"] },
  { label: "Publishing to YouTube",      icon: Youtube,    activeOn: ["uploading"] },
];

const STATUS_ORDER: VideoStatus[] = ["pending", "generating", "rendering", "uploading", "uploaded", "failed"];

function getActiveStep(status: VideoStatus): number {
  switch (status) {
    case "pending":    return 0;
    case "generating": return 1;
    case "rendering":  return 3; // mid-render
    case "uploading":  return 6;
    case "uploaded":   return 7; // all done
    default:           return 0;
  }
}

function StepRow({ step, index, activeStep, status }: {
  step: typeof STEPS[0];
  index: number;
  activeStep: number;
  status: VideoStatus;
}) {
  const Icon = step.icon;
  const isDone    = status === "uploaded" || index < activeStep;
  const isActive  = index === activeStep && status !== "uploaded" && status !== "failed";
  const isFailed  = status === "failed" && index === activeStep;
  const isWaiting = !isDone && !isActive && !isFailed;

  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300 ${
      isActive  ? "bg-primary/10 border border-primary/20" :
      isDone    ? "opacity-50" :
      isFailed  ? "bg-red-500/10 border border-red-500/20" :
      "opacity-30"
    }`}>
      {/* Status icon */}
      {isDone   && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
      {isActive && <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />}
      {isFailed && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
      {isWaiting && <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />}

      {/* Step icon */}
      <Icon className={`h-4 w-4 shrink-0 ${
        isActive ? "text-primary" : isDone ? "text-emerald-400" : "text-muted-foreground"
      }`} />

      {/* Label */}
      <span className={`text-sm flex-1 ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {step.label}
      </span>

      {/* Right tag */}
      {isDone   && <span className="text-xs text-emerald-400">Done</span>}
      {isActive && <span className="text-xs text-primary animate-pulse">Running...</span>}
      {isFailed && <span className="text-xs text-red-400">Failed</span>}
    </div>
  );
}

export function PipelineProgress({ initialLogs }: { initialLogs: VideoLog[] }) {
  const [logs, setLogs] = useState<VideoLog[]>(initialLogs);

  const activeJob = logs.find((l) =>
    ["pending", "generating", "rendering", "uploading"].includes(l.status)
  );
  const latestJob = logs[0];
  const displayJob = activeJob ?? latestJob;

  // Poll every 2s when job is active
  useEffect(() => {
    if (!activeJob) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/job-status");
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status]);

  if (!displayJob) return (
    <Card className="border-dashed border-muted">
      <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
        <Zap className="h-8 w-8 opacity-20" />
        <p className="text-sm">Hit &quot;Trigger Run Now&quot; to start the pipeline</p>
      </CardContent>
    </Card>
  );

  const activeStep = getActiveStep(displayJob.status);
  const isFailed = displayJob.status === "failed";
  const isDone   = displayJob.status === "uploaded";

  return (
    <Card className={`border ${
      isFailed ? "border-red-500/30" :
      isDone   ? "border-emerald-500/30" :
      activeJob ? "border-primary/30" :
      "border-border"
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {activeJob && !isFailed && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            Pipeline Status
          </CardTitle>
          <Badge variant={isFailed ? "destructive" : isDone ? "success" : "pending"}>
            {displayJob.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {displayJob.niche && (
            <p className="text-xs text-muted-foreground">
              Niche: <span className="text-foreground font-medium">{displayJob.niche}</span>
            </p>
          )}
          <span className="text-xs text-muted-foreground">· {timeAgo(displayJob.created_at)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {STEPS.map((step, i) => (
          <StepRow
            key={step.label}
            step={step}
            index={i}
            activeStep={activeStep}
            status={displayJob.status}
          />
        ))}

        {/* Error */}
        {isFailed && displayJob.error_message && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">{displayJob.error_message}</p>
          </div>
        )}

        {/* Success */}
        {isDone && displayJob.youtube_url && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <a href={displayJob.youtube_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:underline">
              View on YouTube →
            </a>
          </div>
        )}

        {/* Generated title */}
        {displayJob.title && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-2">
            Title: <span className="text-foreground">{displayJob.title}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Fix missing import
function Zap({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
