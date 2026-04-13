import os
import asyncio
import subprocess
import tempfile
import httpx
import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import ffmpeg as ffmpeg_python

app = FastAPI(title="WealthFlip Media Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FFMPEG_PATH = "C:\\Users\\AarifKhanMohammad\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffmpeg.exe"
FFPROBE_PATH = "C:\\Users\\AarifKhanMohammad\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffprobe.exe"
TMP_DIR = tempfile.gettempdir()

# ============================================================
# Models
# ============================================================
class TTSRequest(BaseModel):
    script: str
    job_id: str

class FootageRequest(BaseModel):
    keywords: List[str]
    pexels_api_key: str
    job_id: str

class RenderRequest(BaseModel):
    job_id: str
    audio_path: str
    footage_paths: List[str]
    script_segments: List[dict]

class PipelineRequest(BaseModel):
    job_id: str
    script: str
    script_segments: List[dict]
    search_terms: List[str]
    pexels_api_key: str

# ============================================================
# Health check
# ============================================================
@app.get("/health")
def health():
    return {"status": "ok", "service": "WealthFlip Media Backend"}

# ============================================================
# Step 1: Generate TTS audio using edge-tts
# ============================================================
@app.post("/tts")
async def generate_tts(req: TTSRequest):
    output_path = os.path.join(TMP_DIR, f"audio_{req.job_id}.mp3")
    try:
        communicate = edge_tts.Communicate(req.script, "en-US-AriaNeural")
        await communicate.save(output_path)
        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="Audio file not created")
        return {"audio_path": output_path, "job_id": req.job_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

# ============================================================
# Step 2: Fetch and download stock footage from Pexels
# ============================================================
@app.post("/footage")
async def fetch_footage(req: FootageRequest):
    query = " ".join(req.keywords[:2])
    headers = {"Authorization": req.pexels_api_key}
    params = {"query": query, "orientation": "portrait", "size": "medium", "per_page": 5}

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get("https://api.pexels.com/videos/search", headers=headers, params=params)
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Pexels API error: {res.text}")

        videos = res.json().get("videos", [])[:5]
        if not videos:
            raise HTTPException(status_code=404, detail="No videos found on Pexels")

        downloaded = []
        for i, video in enumerate(videos):
            file_url = get_best_video_url(video.get("video_files", []))
            if not file_url:
                continue
            dest = os.path.join(TMP_DIR, f"footage_{req.job_id}_{i}.mp4")
            async with client.stream("GET", file_url) as stream:
                with open(dest, "wb") as f:
                    async for chunk in stream.aiter_bytes():
                        f.write(chunk)
            downloaded.append(dest)

    if not downloaded:
        raise HTTPException(status_code=500, detail="No footage downloaded")

    return {"footage_paths": downloaded, "job_id": req.job_id}

# ============================================================
# Step 3: Render final video with FFmpeg
# ============================================================
@app.post("/render")
async def render_video(req: RenderRequest):
    output_path = os.path.join(TMP_DIR, f"output_{req.job_id}.mp4")
    concat_path = os.path.join(TMP_DIR, f"concat_{req.job_id}.txt")

    # Get audio duration
    duration = get_audio_duration(req.audio_path)

    # Build concat list
    looped = build_looped_list(req.footage_paths, duration)
    with open(concat_path, "w") as f:
        for p in looped:
            f.write(f"file '{p}'\n")

    # Build drawtext subtitle filters
    subtitle_filters = build_subtitle_filters(req.script_segments, duration)
    vf = ",".join([
        "scale=1080:1920:force_original_aspect_ratio=increase",
        "crop=1080:1920",
        *subtitle_filters
    ])

    cmd = [
        FFMPEG_PATH, "-y",
        "-f", "concat", "-safe", "0", "-i", concat_path,
        "-i", req.audio_path,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        output_path
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"FFmpeg error: {result.stderr[-500:]}")

    # Cleanup concat file
    if os.path.exists(concat_path):
        os.remove(concat_path)

    return {"video_path": output_path, "job_id": req.job_id}

# ============================================================
# Full pipeline: TTS + Footage + Render in one call
# ============================================================
@app.post("/pipeline")
async def run_pipeline(req: PipelineRequest):
    # Step 1: TTS
    tts_result = await generate_tts(TTSRequest(script=req.script, job_id=req.job_id))

    # Step 2: Footage
    footage_result = await fetch_footage(FootageRequest(
        keywords=req.search_terms,
        pexels_api_key=req.pexels_api_key,
        job_id=req.job_id
    ))

    # Step 3: Render
    render_result = await render_video(RenderRequest(
        job_id=req.job_id,
        audio_path=tts_result["audio_path"],
        footage_paths=footage_result["footage_paths"],
        script_segments=req.script_segments
    ))

    return {
        "success": True,
        "job_id": req.job_id,
        "audio_path": tts_result["audio_path"],
        "footage_paths": footage_result["footage_paths"],
        "video_path": render_result["video_path"]
    }

# ============================================================
# Serve rendered video file
# ============================================================
@app.get("/video/{job_id}")
def get_video(job_id: str):
    path = os.path.join(TMP_DIR, f"output_{job_id}.mp4")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(path, media_type="video/mp4")

# ============================================================
# Cleanup temp files for a job
# ============================================================
@app.delete("/cleanup/{job_id}")
def cleanup(job_id: str):
    removed = []
    for f in os.listdir(TMP_DIR):
        if job_id in f:
            try:
                os.remove(os.path.join(TMP_DIR, f))
                removed.append(f)
            except:
                pass
    return {"removed": removed}

# ============================================================
# Helpers
# ============================================================
def get_best_video_url(files: list) -> str:
    portrait = [f for f in files if f.get("height", 0) > f.get("width", 0)]
    hd = next((f for f in portrait if f.get("quality") == "hd"), None)
    chosen = hd or (portrait[0] if portrait else (files[0] if files else None))
    return chosen["link"] if chosen else ""

def get_audio_duration(audio_path: str) -> float:
    result = subprocess.run(
        [FFPROBE_PATH, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except:
        return 60.0

def build_looped_list(paths: list, target: float) -> list:
    result, total, i = [], 0, 0
    while total < target:
        result.append(paths[i % len(paths)])
        total += 10
        i += 1
    return result

def build_subtitle_filters(segments: list, total: float) -> list:
    seg_dur = total / max(len(segments), 1)
    filters = []
    for i, seg in enumerate(segments):
        start = round(i * seg_dur, 2)
        end = round((i + 1) * seg_dur, 2)
        text = seg.get("text", "").replace("'", "\u2019").replace(":", "\\:").replace("[", "\\[").replace("]", "\\]")
        filters.append(
            f"drawtext=text='{text}':fontsize=52:fontcolor=white:"
            f"borderw=3:bordercolor=black:"
            f"x=(w-text_w)/2:y=(h-text_h)/2+300:"
            f"enable='between(t,{start},{end})'"
        )
    return filters
