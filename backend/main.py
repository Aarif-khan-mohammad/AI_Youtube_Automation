import os
import asyncio
import subprocess
import tempfile
import httpx
import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="WealthFlip Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ────────────────────────────────────────────────────
FFMPEG  = "C:\\Users\\AarifKhanMohammad\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffmpeg.exe"
FFPROBE = "C:\\Users\\AarifKhanMohammad\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffprobe.exe"
TMP     = tempfile.gettempdir()

GEMINI_KEY = "AIzaSyAaX3l79C9woiSomQugXTiJlwmODublQ5k"
PEXELS_KEY = "OJHorpjRiPipOxlXrqqL0czOCDJ6JMqShI7H0dXSr9BFE8SnwSCKvm8C"

# ── Models ────────────────────────────────────────────────────
class PipelineRequest(BaseModel):
    job_id: str
    script: str
    script_segments: List[dict]
    search_terms: List[str]

class TTSRequest(BaseModel):
    job_id: str
    script: str

# ── Health ────────────────────────────────────────────────────
@app.get("/health")
def health():
    ffmpeg_ok = os.path.exists(FFMPEG)
    return {
        "status": "ok",
        "ffmpeg": "✅" if ffmpeg_ok else "❌ not found",
        "tmp_dir": TMP,
    }

# ── TTS ───────────────────────────────────────────────────────
@app.post("/tts")
async def generate_tts(req: TTSRequest):
    out = os.path.join(TMP, f"audio_{req.job_id}.mp3")
    try:
        communicate = edge_tts.Communicate(req.script, "en-US-AriaNeural")
        await communicate.save(out)
        if not os.path.exists(out):
            raise HTTPException(500, "Audio file not created")
        return {"audio_path": out}
    except Exception as e:
        raise HTTPException(500, f"TTS failed: {e}")

# ── Footage ───────────────────────────────────────────────────
@app.post("/footage")
async def fetch_footage(job_id: str, keywords: List[str]):
    query = " ".join(keywords[:2])
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            "https://api.pexels.com/videos/search",
            headers={"Authorization": PEXELS_KEY},
            params={"query": query, "orientation": "portrait", "per_page": 5},
        )
        if r.status_code != 200:
            raise HTTPException(500, f"Pexels error: {r.text[:200]}")

        videos = r.json().get("videos", [])[:5]
        if not videos:
            raise HTTPException(404, "No Pexels videos found")

        paths = []
        for i, v in enumerate(videos):
            url = _best_url(v.get("video_files", []))
            if not url:
                continue
            dest = os.path.join(TMP, f"footage_{job_id}_{i}.mp4")
            async with client.stream("GET", url) as s:
                with open(dest, "wb") as f:
                    async for chunk in s.aiter_bytes(8192):
                        f.write(chunk)
            paths.append(dest)

    if not paths:
        raise HTTPException(500, "No footage downloaded")
    return {"footage_paths": paths}

# ── Render ────────────────────────────────────────────────────
@app.post("/render")
def render_video(job_id: str, audio_path: str, footage_paths: List[str], segments: List[dict]):
    out      = os.path.join(TMP, f"output_{job_id}.mp4")
    concat_f = os.path.join(TMP, f"concat_{job_id}.txt")

    duration = _audio_duration(audio_path)
    looped   = _loop_footage(footage_paths, duration)

    with open(concat_f, "w") as f:
        for p in looped:
            f.write(f"file '{p}'\n")

    vf = ",".join([
        "scale=1080:1920:force_original_aspect_ratio=increase",
        "crop=1080:1920",
        *_subtitle_filters(segments, duration),
    ])

    cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0", "-i", concat_f,
        "-i", audio_path,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", "-movflags", "+faststart", "-pix_fmt", "yuv420p",
        out,
    ]

    r = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(concat_f):
        os.remove(concat_f)
    if r.returncode != 0:
        raise HTTPException(500, f"FFmpeg: {r.stderr[-600:]}")

    return {"video_path": out}

# ── Full Pipeline ─────────────────────────────────────────────
@app.post("/pipeline")
async def pipeline(req: PipelineRequest):
    # 1. TTS
    tts = await generate_tts(TTSRequest(job_id=req.job_id, script=req.script))

    # 2. Footage
    footage = await fetch_footage(job_id=req.job_id, keywords=req.search_terms)

    # 3. Render
    result = render_video(
        job_id=req.job_id,
        audio_path=tts["audio_path"],
        footage_paths=footage["footage_paths"],
        segments=req.script_segments,
    )

    return {
        "success": True,
        "job_id": req.job_id,
        "video_path": result["video_path"],
        "audio_path": tts["audio_path"],
    }

# ── Cleanup ───────────────────────────────────────────────────
@app.delete("/cleanup/{job_id}")
def cleanup(job_id: str):
    removed = []
    for f in os.listdir(TMP):
        if job_id in f:
            try:
                os.remove(os.path.join(TMP, f))
                removed.append(f)
            except:
                pass
    return {"removed": removed}

# ── Helpers ───────────────────────────────────────────────────
def _best_url(files: list) -> str:
    portrait = [f for f in files if f.get("height", 0) > f.get("width", 0)]
    hd = next((f for f in portrait if f.get("quality") == "hd"), None)
    chosen = hd or (portrait[0] if portrait else (files[0] if files else None))
    return chosen["link"] if chosen else ""

def _audio_duration(path: str) -> float:
    r = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True,
    )
    try:
        return float(r.stdout.strip())
    except:
        return 60.0

def _loop_footage(paths: list, target: float) -> list:
    result, total, i = [], 0, 0
    while total < target + 5:
        result.append(paths[i % len(paths)])
        total += 10
        i += 1
    return result

def _subtitle_filters(segments: list, total: float) -> list:
    n = max(len(segments), 1)
    seg_dur = total / n
    out = []
    for i, seg in enumerate(segments):
        s = round(i * seg_dur, 2)
        e = round((i + 1) * seg_dur, 2)
        text = (seg.get("text", "")
                .replace("'", "\u2019")
                .replace(":", "\\:")
                .replace("[", "\\[")
                .replace("]", "\\]")
                .replace("%", "\\%"))
        out.append(
            f"drawtext=text='{text}':fontsize=48:fontcolor=white:"
            f"borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-200:"
            f"enable='between(t,{s},{e})'"
        )
    return out
