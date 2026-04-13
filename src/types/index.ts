// ============================================================
// Database Table Types
// ============================================================

export interface UserSettings {
  id: string;
  user_id: string;
  gemini_api_key: string | null;
  pexels_api_key: string | null;
  youtube_channel_id: string | null;
  youtube_access_token: string | null;
  youtube_refresh_token: string | null;
  youtube_token_expiry: string | null;
  auto_upload_enabled: boolean;
  daily_run_time: string;
  created_at: string;
  updated_at: string;
}

export interface VideoLog {
  id: string;
  user_id: string;
  niche: string | null;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  script: string | null;
  search_terms: string[] | null;
  audio_url: string | null;
  video_url: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  status: VideoStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type VideoStatus =
  | "pending"
  | "generating"
  | "rendering"
  | "uploading"
  | "uploaded"
  | "failed";

// ============================================================
// Gemini AI Response Types
// ============================================================

export interface ScriptSegment {
  text: string;
  image_prompt: string;
}

export interface GeneratedContent {
  title: string;
  description: string;
  tags: string[];
  script_segments: ScriptSegment[];
  search_terms_for_background_video: string[];
  full_script: string;
}

// ============================================================
// Pexels API Types
// ============================================================

export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  video_files: PexelsVideoFile[];
  url: string;
}

export interface PexelsSearchResponse {
  videos: PexelsVideo[];
  total_results: number;
  page: number;
  per_page: number;
}

// ============================================================
// YouTube OAuth Types
// ============================================================

export interface YouTubeTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface YouTubeUploadParams {
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  categoryId?: string;
}

// ============================================================
// Automation Pipeline Types
// ============================================================

export interface PipelineResult {
  success: boolean;
  jobId: string;
  youtubeUrl?: string;
  error?: string;
}
