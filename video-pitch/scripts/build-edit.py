#!/usr/bin/env python3
"""Rebuild assets/footage/edit.mp4 from the raw take (video-pitch/_src, outside git).

1. Swap the camera audio in Ultima.MP4 for the mic (Intento 3 completo.m4a), delayed 0.136 s
   (measured by cross-correlation; drift < 2 ms over 6 min).
2. Cut the 8 ranges from STORYBOARD.md § Cut list and concatenate them with 12 ms audio fades.
   Picture: every take seam is a 10-frame dissolve centred on the cut (5 frames of handle taken
   from each side), so the audio cut stays exact. Contiguous ranges are not a seam.
3. Natural grade (variant C, chosen by Luciano 9/10): a touch of warmth, contrast and skin colour.

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

FPS = 30
H = 5 / FPS  # dissolve handle per side
GRADE = ("colorbalance=rm=.04:gm=.01:bm=-.03:rs=.025:bs=-.025,vibrance=intensity=0.22,"
         "eq=contrast=1.06:gamma=0.96:saturation=1.04")

graph, t, segs = [], 0.0, []  # segs: [start_src, dur] of picture runs between real seams
for i, (s, e) in enumerate(CLIPS):
    s += OFFSET
    d = round((e + OFFSET - s) * FPS) / FPS
    graph.append(f"[0:a]atrim=start={s:.4f}:duration={d:.4f},asetpts=PTS-STARTPTS,"
                 f"afade=t=in:d=0.012,afade=t=out:st={d - 0.012:.4f}:d=0.012[a{i}];")
    if segs and abs(segs[-1][0] + segs[-1][1] - s) < 0.05:
        segs[-1][1] += d  # contiguous in the source: same picture run
    else:
        segs.append([s, d])
    print(f"C{i} timeline {t:.3f}-{t + d:.3f}")
    t += d
n = len(segs)
for k, (s, d) in enumerate(segs):
    pre = H if k > 0 else 0
    post = H if k < n - 1 else 0
    graph.append(f"[0:v]trim=start={s - pre:.4f}:duration={d + pre + post:.4f},setpts=PTS-STARTPTS[v{k}];")
acc, prev = segs[0][1] + H, "v0"
for k in range(1, n):
    off = acc - 2 * H
    out = f"x{k}"
    graph.append(f"[{prev}][v{k}]xfade=transition=fade:duration={2 * H:.4f}:offset={off:.4f}[{out}];")
    acc = acc + segs[k][1] + H + (H if k < n - 1 else 0) - 2 * H
    prev = out
graph.append(f"[{prev}]{GRADE},format=yuv420p[v];")
graph.append("".join(f"[a{i}]" for i in range(len(CLIPS))) + f"concat=n={len(CLIPS)}:v=0:a=1[a]")
OUT.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(SYNCED), "-filter_complex", "".join(graph),
                "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-r", "30",
                "-g", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                str(OUT)], check=True)
print(f"total {t:.3f}s → {OUT}")
