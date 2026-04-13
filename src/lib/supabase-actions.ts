"use server";

import { createServerSupabaseClient, createAdminClient } from "./supabase-server";
import type { UserSettings, VideoLog, VideoStatus, YouTubeTokens } from "@/types";

// ============================================================
// Upsert YouTube OAuth tokens for the authenticated user
// ============================================================
export async function upsertYouTubeTokens(tokens: YouTubeTokens, channelId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_settings")
    .update({
      youtube_access_token: tokens.access_token,
      youtube_refresh_token: tokens.refresh_token,
      youtube_token_expiry: new Date(tokens.expiry_date).toISOString(),
      youtube_channel_id: channelId,
    })
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

// ============================================================
// Fetch user settings for the authenticated user
// ============================================================
export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

// ============================================================
// Save API keys (Gemini + Pexels) for the authenticated user
// ============================================================
export async function saveApiKeys(geminiKey: string, pexelsKey: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_settings")
    .update({ gemini_api_key: geminiKey, pexels_api_key: pexelsKey })
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

// ============================================================
// Update auto-upload settings
// ============================================================
export async function updateAutoUploadSettings(enabled: boolean, runTime: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_settings")
    .update({ auto_upload_enabled: enabled, daily_run_time: runTime })
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

// ============================================================
// Create a new video job log entry
// ============================================================
export async function createVideoJob(userId: string, niche: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("video_logs")
    .insert({ user_id: userId, niche, status: "pending" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

// ============================================================
// Update video job status and fields
// ============================================================
export async function updateVideoJob(
  jobId: string,
  updates: Partial<Omit<VideoLog, "id" | "user_id" | "created_at" | "updated_at">>
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("video_logs")
    .update(updates)
    .eq("id", jobId);

  if (error) throw new Error(error.message);
}

// ============================================================
// Fetch the next pending job (used by cron)
// ============================================================
export async function getNextPendingJob(userId: string): Promise<VideoLog | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("video_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return data;
}

// ============================================================
// Fetch video job history for the dashboard
// ============================================================
export async function getVideoHistory(userId: string): Promise<VideoLog[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("video_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

// ============================================================
// Fetch user settings by user_id (used by cron/admin routes)
// ============================================================
export async function getUserSettingsById(userId: string): Promise<UserSettings | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  return data;
}
