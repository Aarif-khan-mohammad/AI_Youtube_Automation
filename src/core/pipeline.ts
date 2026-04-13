import { generateVideoScript, getTodaysPillar } from "@/core/ai/generator";
import { refreshAccessToken, uploadToYouTube } from "@/core/youtube/uploader";
import { createAdminClient } from "@/lib/supabase-server";
import type { PipelineResult, UserSettings } from "@/types";
import fs from "fs";

const PYTHON_API = "http://localhost:8001";

// ── Main Pipeline ─────────────────────────────────────────────
export async function runAutomationPipeline(userId: string): Promise<PipelineResult> {
  let jobId = "";
  const admin = createAdminClient();

  try {
    // 1. Load settings directly via admin
    const { data: settings, error: settingsError } = await admin
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (settingsError) throw new Error(`DB error: ${settingsError.message}`);
    if (!settings?.gemini_api_key) throw new Error("Gemini API key not set in database. Run /api/debug first.");
    if (!settings?.pexels_api_key) throw new Error("Pexels API key not set in database.");
    if (!settings?.youtube_refresh_token) throw new Error("YouTube not connected.");

    // 2. Get niche
    const niche = getTodaysPillar().niche;

    // 3. Create job
    const { data: job, error: jobError } = await admin
      .from("video_logs")
      .insert({ user_id: userId, niche, status: "pending" })
      .select("id")
      .single();
    if (jobError) throw new Error(`Job create failed: ${jobError.message}`);
    jobId = job.id;

    // 4. Generate script
    await admin.from("video_logs").update({ status: "generating" }).eq("id", jobId);
    const content = await generateVideoScript(niche, settings.gemini_api_key);
    await admin.from("video_logs").update({
      title: content.title,
      description: content.description,
      tags: content.tags,
      script: content.full_script,
      search_terms: content.search_terms_for_background_video,
    }).eq("id", jobId);

    // 5. Python: TTS + Footage + Render
    await admin.from("video_logs").update({ status: "rendering" }).eq("id", jobId);

    const pyRes = await fetch(`${PYTHON_API}/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        script: content.full_script,
        script_segments: content.script_segments,
        search_terms: content.search_terms_for_background_video,
      }),
    });

    if (!pyRes.ok) {
      const err = await pyRes.json().catch(() => ({ detail: "Python backend error" }));
      throw new Error(err.detail ?? "Python pipeline failed");
    }

    const { video_path } = await pyRes.json();
    if (!video_path || !fs.existsSync(video_path)) {
      throw new Error("Rendered video file not found");
    }

    // 6. Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(video_path);
    const storagePath = `videos/${userId}/${jobId}.mp4`;
    const { error: storageError } = await admin.storage
      .from("videos")
      .upload(storagePath, fileBuffer, { contentType: "video/mp4", upsert: true });
    if (storageError) throw new Error(`Storage: ${storageError.message}`);
    const { data: urlData } = admin.storage.from("videos").getPublicUrl(storagePath);
    await admin.from("video_logs").update({ video_url: urlData.publicUrl }).eq("id", jobId);

    // 7. YouTube upload
    await admin.from("video_logs").update({ status: "uploading" }).eq("id", jobId);
    const freshTokens = await refreshAccessToken(settings.youtube_refresh_token);

    // Save refreshed token
    await admin.from("user_settings").update({
      youtube_access_token: freshTokens.access_token,
      youtube_refresh_token: freshTokens.refresh_token,
      youtube_token_expiry: new Date(freshTokens.expiry_date).toISOString(),
    }).eq("user_id", userId);

    const youtubeUrl = await uploadToYouTube(
      { videoPath: video_path, title: content.title, description: content.description, tags: content.tags, categoryId: "27" },
      freshTokens.access_token,
      freshTokens.refresh_token
    );

    const youtubeVideoId = youtubeUrl.split("v=")[1];
    await admin.from("video_logs").update({
      status: "uploaded",
      youtube_video_id: youtubeVideoId,
      youtube_url: youtubeUrl,
    }).eq("id", jobId);

    // 8. Cleanup
    await fetch(`${PYTHON_API}/cleanup/${jobId}`, { method: "DELETE" }).catch(() => {});

    return { success: true, jobId, youtubeUrl };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jobId) {
      await admin.from("video_logs").update({ status: "failed", error_message: message }).eq("id", jobId);
    }
    return { success: false, jobId, error: message };
  }
}
