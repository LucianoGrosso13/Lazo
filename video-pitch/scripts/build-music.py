#!/usr/bin/env python3
"""Build the 114 s music beds from the HeyGen catalog tracks in .media/audio/bgm/.

Each track is shorter than the video, so it is extended with one beat-aligned
jump back (J = whole beats, tempo from `hyperframes beats`) hidden in a
crossfade. The track's own outro is placed on the closing plate (107.4–114 s).
Beds are normalized to -14 LUFS; levels under the voice are set in index.html.

Usage: python3 scripts/build-music.py   (from video-pitch/)
"""
import json
import subprocess

TOTAL = 114.0
SR = 44100

# name: source, beat period (s), jump in beats, crossfade start a (s, source time),
#       crossfade length d (s), lead-in pad (s) before the track starts, end fade (s)
BEDS = {
    # gentle ambient inspirational, soft piano and warm pads (102 s, ~120 bpm); content ends ~94 s
    "a-piano": dict(src="bgm_004.wav", p=0.5006, beats=40, a=40.0, d=4.0, pad=-2.02, fade_out=1.0),
    # friendly encouraging corporate ambient (94 s, ~122 bpm); outro 78–88 s
    "b-ambient": dict(src="bgm_005.wav", p=0.4908, beats=48, a=45.0, d=3.0, pad=2.94, fade_out=1.0),
    # minimal ambient tech, subtle pulses (60 s, 125 bpm); no outro, so fade at the end
    "c-pulso": dict(src="bgm_003.wav", p=0.48, beats=112, a=59.8, d=3.0, pad=0.24, fade_out=2.5),
}


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def lufs(path):
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-t", "107", "-i", path, "-af", "ebur128=framelog=quiet", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    lines = [l for l in out.splitlines() if l.strip().startswith("I:")]
    return float(lines[-1].split()[1])


for name, b in BEDS.items():
    src = f".media/audio/bgm/{b['src']}"
    jump = b["beats"] * b["p"]
    s = b["a"] - b["d"] - jump  # second piece starts here: same beat phase inside the crossfade
    assert s >= 0, name
    raw = f"/tmp/bed-{name}.wav"
    lead = (
        f"adelay={int(b['pad'] * 1000)}:all=1" if b["pad"] > 0 else f"atrim=start={-b['pad']},asetpts=PTS-STARTPTS"
    )
    fc = (
        f"[0:a]atrim=0:{b['a']},asetpts=PTS-STARTPTS[p1];"
        f"[0:a]atrim=start={s},asetpts=PTS-STARTPTS[p2];"
        f"[p1][p2]acrossfade=d={b['d']}:c1=qsin:c2=qsin,{lead},"
        f"atrim=0:{TOTAL},afade=t=in:d=0.6,afade=t=out:st={TOTAL - b['fade_out']}:d={b['fade_out']},"
        f"apad=whole_dur={TOTAL}[out]"
    )
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-filter_complex", fc, "-map", "[out]", "-ar", str(SR), raw])
    gain = -14.0 - lufs(raw)
    out = f"assets/audio/bed-{name}.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"volume={gain:.2f}dB", out])
    print(json.dumps({"bed": out, "jump_s": round(jump, 3), "second_piece_from": round(s, 3), "gain_db": round(gain, 2)}))
