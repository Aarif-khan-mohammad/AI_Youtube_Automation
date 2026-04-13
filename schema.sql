-- ============================================================
-- AI YouTube Automation - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Table: user_settings
-- Stores per-user API keys and YouTube OAuth tokens
-- ============================================================
create table public.user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  gemini_api_key text,
  pexels_api_key text,
  youtube_channel_id text,
  youtube_access_token text,
  youtube_refresh_token text,
  youtube_token_expiry timestamptz,
  auto_upload_enabled boolean default false,
  daily_run_time text default '09:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Table: video_logs
-- Tracks every automation run and its status
-- ============================================================
create table public.video_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  niche text,
  title text,
  description text,
  tags text[],
  script text,
  search_terms text[],
  audio_url text,
  video_url text,
  youtube_video_id text,
  youtube_url text,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'rendering', 'uploading', 'uploaded', 'failed')),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_video_logs_user_id on public.video_logs(user_id);
create index idx_video_logs_status on public.video_logs(status);
create index idx_video_logs_created_at on public.video_logs(created_at desc);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table public.user_settings enable row level security;
alter table public.video_logs enable row level security;

-- user_settings: users can only read/write their own row
create policy "Users can manage own settings"
  on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- video_logs: users can only read/write their own logs
create policy "Users can manage own video logs"
  on public.video_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_user_settings_updated
  before update on public.user_settings
  for each row execute procedure public.handle_updated_at();

create trigger on_video_logs_updated
  before update on public.video_logs
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- Auto-create user_settings row on new user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
