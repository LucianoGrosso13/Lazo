#!/usr/bin/env python3
"""Rebuild assets/footage/edit.mp4 from the raw take (video-pitch/_src, outside git).

1. Swap the camera audio in Ultima.MP4 for the mic (Intento 3 completo.m4a), delayed 0.136 s
   (measured by cross-correlation; drift < 2 ms over 6 min).
2. Cut the 8 ranges from STORYBOARD.md § Cut list and concatenate them with 12 ms audio fades.

Usage (from video-pitch/): python3 scripts/build-edit.py
"""
import pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "_src" / "video hackaton"
SYNCED = ROOT / "_src" / "take-synced.mp4"
OUT = ROOT / "assets" / "footage" / "edit.mp4"
OFFSET = 0.136  # cam_time = mic_time + OFFSET
CLIPS = [  # mic-audio times (s)
    (23.15, 31.30), (31.30, 40.68), (58.15, 67.79), (90.75, 100.85),
    (110.95, 132.95), (141.95, 155.30), (213.50, 231.90), (337.80, 354.45),
]

if not SYNCED.exists():
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SRC / "Ultima.MP4"), "-itsoffset", str(OFFSET),
                    "-i", str(SRC / "Intento 3 completo.m4a"), "-map", "0:v", "-map", "1:a",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", "30", "-g", "30",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(SYNCED)], check=True)

graph, t = [], 0.0
for i, (s, e) in enumerate(CLIPS):
    s += OFFSET
    d = round((e + OFFSET - s) * 30) / 30
    graph.append(f"[0:v]trim=start={s:.4f}:duration={d:.4f},setpts=PTS-STARTPTS[v{i}];")
    graph.append(f"[0:a]atrim=start={s:.4f}:duration={d:.4f},asetpts=PTS-STARTPTS,"
                 f"afade=t=in:d=0.012,afade=t=out:st={d - 0.012:.4f}:d=0.012[a{i}];")
    print(f"C{i} timeline {t:.3f}-{t + d:.3f}")
    t += d
graph.append("".join(f"[v{i}][a{i}]" for i in range(len(CLIPS))) + f"concat=n={len(CLIPS)}:v=1:a=1[v][a]")
OUT.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SYNCED), "-filter_complex", "".join(graph),
                "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-r", "30",
                "-g", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                str(OUT)], check=True)
print(f"total {t:.3f}s → {OUT}")
