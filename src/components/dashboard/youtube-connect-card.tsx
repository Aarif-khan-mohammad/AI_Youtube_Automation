"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Youtube, CheckCircle } from "lucide-react";

export function YoutubeConnectCard({
  channelId,
  channelName,
}: {
  channelId: string | null;
  channelName: string | null;
}) {
  const isConnected = !!channelId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">YouTube Channel</CardTitle>
        <CardDescription>Connect your channel to enable auto-publishing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Connected</p>
              <p className="text-xs text-muted-foreground">{channelName ?? channelId}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <Youtube className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No channel connected</p>
          </div>
        )}
        <a href="/api/youtube/connect">
          <Button variant={isConnected ? "outline" : "default"} className="w-full">
            <Youtube className="h-4 w-4" />
            {isConnected ? "Reconnect YouTube" : "Connect YouTube Channel"}
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
