import { google } from "googleapis";
import fs from "fs";
import type { YouTubeTokens, YouTubeUploadParams } from "@/types";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ============================================================
// Generate the Google OAuth consent URL
// ============================================================
export function getOAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
  });
}

// ============================================================
// Exchange auth code for tokens
// ============================================================
export async function exchangeCodeForTokens(code: string): Promise<YouTubeTokens> {
  const { tokens } = await oauth2Client.getToken(code);
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expiry_date: tokens.expiry_date!,
  };
}

// ============================================================
// Refresh access token using stored refresh_token
// ============================================================
export async function refreshAccessToken(
  refreshToken: string
): Promise<YouTubeTokens> {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    access_token: credentials.access_token!,
    refresh_token: credentials.refresh_token ?? refreshToken,
    expiry_date: credentials.expiry_date!,
  };
}

// ============================================================
// Get authenticated YouTube channel info
// ============================================================
export async function getChannelInfo(accessToken: string, refreshToken: string) {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const res = await youtube.channels.list({
    part: ["snippet"],
    mine: true,
  });

  const channel = res.data.items?.[0];
  return {
    id: channel?.id ?? "",
    name: channel?.snippet?.title ?? "",
  };
}

// ============================================================
// Upload video to YouTube
// ============================================================
export async function uploadToYouTube(
  params: YouTubeUploadParams,
  accessToken: string,
  refreshToken: string
): Promise<string> {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: params.title,
        description: params.description,
        tags: params.tags,
        categoryId: params.categoryId ?? "27", // 27 = Education
        defaultLanguage: "en",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: "video/mp4",
      body: fs.createReadStream(params.videoPath),
    },
  });

  const videoId = res.data.id;
  if (!videoId) throw new Error("YouTube upload failed — no video ID returned");

  return `https://www.youtube.com/watch?v=${videoId}`;
}
