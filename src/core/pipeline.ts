import { getTrendingNicheFromRSS } from "@/core/trends/fetcher";
import { generateVideoScript } from "@/core/ai/generator";
import { refreshAccessToken, uploadToYouTube } from "@/core/youtube/uploader";
import {
  createVideoJob,
  updateVideoJob,
  getUserSettingsById,
  upsertYouTubeTokens,
} from "@/lib/supabase-actions";
import { createAdminClient } from "@/lib/supabase-server";
import type { PipelineResult } from "@/types";
import fs from "fs";

const PYTHON_API = "http://localhost:8000";

export async function runAutomationPipeline(userId: string): Promise<PipelineResult> {
  let jobId = "";

  try {
    // Step 1: Load user settings
    const settings = await getUserSettingsById(userId);
    if (!settings?.gemini_api_key) throw new Error("Gemini API key not configured");
    if (!settings?.pexels_api_key) throw new Error("Pexels API key not configured");
    if (!settings?.youtube_refresh_token) throw new Error("YouTube not connected");

    // Step 2: Get trending niche
    const niche = await getTrendingNicheFromRSS();
    jobId = await createVideoJob(userId, niche);

    // Step 3: Generate script
    await updateVideoJob(jobId, { status: "generating" });
    const content = await generateVideoScript(niche, settings.gemini_api_key);
    await updateVideoJob(jobId, {
      title: content.title,
      description: content.description,
      tags: content.tags,
      script: content.full_script,
      search_terms: content.search_terms_for_background_video,
    });

    // Step 4: Call Python backend — TTS + Footage + Render
    await updateVideoJob(jobId, { status: "rendering" });
    const pipelineRes = await fetch(`${PYTHON_API}/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        script: content.full_script,
        script_segments: content.script_segments,
        search_terms: content.search_terms_for_background_video,
        pexels_api_key: settings.pexels_api_key,
      }),
    });

    if (!pipelineRes.ok) {
      const err = await pipelineRes.json();
      throw new Error(err.detail ?? "Python pipeline failed");
    }

    const { video_path } = await pipelineRes.json();

    // Step 5: Upload video to Supabase Storage
    const videoUrl = await uploadVideoToStorage(video_path, jobId, userId);
    await updateVideoJob(jobId, { video_url: videoUrl });

    // Step 6: Refresh YouTube token + upload
    await updateVideoJob(jobId, { status: "uploading" });
    const freshTokens = await refreshAccessToken(settings.youtube_refresh_token);
    await upsertYouTubeTokens(freshTokens, settings.youtube_channel_id ?? "", userId);

    const youtubeUrl = await uploadToYouTube(
      { videoPath: video_path, title: content.title, description: content.description, tags: content.tags, categoryId: "27" },
      freshTokens.access_token,
      freshTokens.refresh_token
    );

    const youtubeVideoId = youtubeUrl.split("v=")[1];
    await updateVideoJob(jobId, { status: "uploaded", youtube_video_id: youtubeVideoId, youtube_url: youtubeUrl });

    // Step 7: Cleanup
    await fetch(`${PYTHON_API}/cleanup/${jobId}`, { method: "DELETE" });

    return { success: true, jobId, youtubeUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (jobId) await updateVideoJob(jobId, { status: "failed", error_message: message });
    return { success: false, jobId, error: message };
  }
}

async function uploadVideoToStorage(videoPath: string, jobId: string, userId: string): Promise<string> {
  const admin = createAdminClient();
  const fileBuffer = fs.readFileSync(videoPath);
  const storagePath = `videos/${userId}/${jobId}.mp4`;

  const { error } = await admin.storage
    .from("videos")
    .upload(storagePath, fileBuffer, { contentType: "video/mp4", upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = admin.storage.from("videos").getPublicUrl(storagePath);
  return data.publicUrl;
}
