-- ============================================================
-- Run this in Supabase SQL Editor to manually set credentials
-- Go to: https://supabase.com/dashboard/project/kutudhdgzpmkgeedwltp/sql
-- Replace the placeholder values with your actual keys from .env.local
-- ============================================================

-- Step 1: Check if user exists
SELECT id, email FROM auth.users LIMIT 5;

-- Step 2: Update credentials (replace placeholders with real values from .env.local)
UPDATE public.user_settings
SET
  gemini_api_key        = '<YOUR_GEMINI_API_KEY>',
  pexels_api_key        = '<YOUR_PEXELS_API_KEY>',
  youtube_access_token  = '<YOUR_YOUTUBE_ACCESS_TOKEN>',
  youtube_refresh_token = '<YOUR_YOUTUBE_REFRESH_TOKEN>',
  youtube_token_expiry  = NOW() + INTERVAL '1 hour',
  youtube_channel_id    = 'WealthFlip',
  auto_upload_enabled   = true
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);

-- Step 3: Verify
SELECT
  user_id,
  CASE WHEN gemini_api_key IS NOT NULL THEN 'SET' ELSE 'MISSING' END AS gemini,
  CASE WHEN pexels_api_key IS NOT NULL THEN 'SET' ELSE 'MISSING' END AS pexels,
  CASE WHEN youtube_refresh_token IS NOT NULL THEN 'SET' ELSE 'MISSING' END AS youtube,
  youtube_channel_id,
  auto_upload_enabled
FROM public.user_settings;
