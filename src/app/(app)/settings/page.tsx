import { createServerSupabaseClient } from "@/lib/supabase";
import { getUserSettings } from "@/lib/supabase-actions";
import { ApiKeysForm } from "@/components/dashboard/api-keys-form";
import { YoutubeConnectCard } from "@/components/dashboard/youtube-connect-card";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const settings = user ? await getUserSettings() : null;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your API keys and YouTube channel connection.
        </p>
      </div>

      {/* API Keys */}
      <ApiKeysForm
        defaultGemini={settings?.gemini_api_key ?? ""}
        defaultPexels={settings?.pexels_api_key ?? ""}
      />

      {/* YouTube */}
      <YoutubeConnectCard
        channelId={settings?.youtube_channel_id ?? null}
        channelName={settings?.youtube_channel_id ?? null}
      />
    </div>
  );
}
