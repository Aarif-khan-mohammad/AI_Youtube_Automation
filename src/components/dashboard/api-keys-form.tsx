"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

export function ApiKeysForm({
  defaultGemini,
  defaultPexels,
}: {
  defaultGemini: string;
  defaultPexels: string;
}) {
  const [gemini, setGemini] = useState(defaultGemini);
  const [pexels, setPexels] = useState(defaultPexels);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gemini_api_key: gemini, pexels_api_key: pexels }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "API keys saved successfully" });
      } else {
        toast({ variant: "destructive", title: "Failed to save", description: data.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">API Keys</CardTitle>
        <CardDescription>Your keys are stored securely in Supabase.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gemini">Gemini API Key</Label>
          <Input
            id="gemini"
            type="password"
            placeholder="AIza..."
            value={gemini}
            onChange={(e) => setGemini(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pexels">Pexels API Key</Label>
          <Input
            id="pexels"
            type="password"
            placeholder="Your Pexels API key"
            value={pexels}
            onChange={(e) => setPexels(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Keys
        </Button>
      </CardContent>
    </Card>
  );
}
