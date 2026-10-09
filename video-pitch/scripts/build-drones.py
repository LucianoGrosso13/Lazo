#!/usr/bin/env python3
"""Drone formation for compositions/s09b-drones.html: the Lazo prism + "LAZO" in dots.

Recreates the stadium drone-show meme on assets/plate/estadio-sin-logo.jpg (the original logo
was painted out of the sky). Letters are hollow, like a real drone show: dots sit on the glyph
outline. Everything random is seeded here, so the composition stays deterministic.

Usage: python3 scripts/build-drones.py  → prints JSON [[x, y, sx, sy, delay, colour], ...]
"""
import json, math, random
from PIL import Image, ImageDraw, ImageFont

FONT = ("/System/Library/Fonts/Avenir Next.ttc", 0)  # face 0 = Bold
GAP = 11.5  # px between neighbouring drones
DX = 64  # shift the whole formation so it centres over the stadium
rng = random.Random(7)
pts = []  # (x, y, colour)


def seg(a, b, col, step=GAP):
    n = max(1, round(math.dist(a, b) / step))
    for i in range(n + 1):
        t = i / n
        pts.append((a[0] + (b[0] - a[0]) * t + DX, a[1] + (b[1] - a[1]) * t, col))


# Prism (apex up), its inner edge, the white beam in and the three rays out, as in the logo.
apex, bl, br = (560, 118), (452, 306), (668, 306)
for a, b in ((apex, bl), (bl, br), (br, apex)):
    seg(a, b, "w")
seg(apex, (598, 306), "w", GAP * 1.15)
seg((352, 252), (506, 212), "w")
rx, ry = (614 + 6, 212)
for (ex, ey), col in (((722, 178), "v"), ((728, 214), "c"), ((722, 250), "g")):
    seg((rx, ry), (ex, ey), col)

# "LAZO" as hollow letters: sample the glyph outline with a minimum spacing.
font = ImageFont.truetype(FONT[0], 238, index=FONT[1])
img = Image.new("L", (900, 320), 0)
ImageDraw.Draw(img).text((0, 0), "LAZO", font=font, fill=255)
bbox = img.getbbox()
img = img.crop(bbox)
w, h = img.size
scale = 176 / h  # cap height on screen
ox, oy = 776, 124
px = img.load()
edge = [(x, y) for y in range(1, h - 1) for x in range(1, w - 1)
        if px[x, y] > 127 and min(px[x - 1, y], px[x + 1, y], px[x, y - 1], px[x, y + 1]) <= 127]
chosen = []
cell = {}
for x, y in sorted(edge, key=lambda p: (p[0] // 3, p[1])):
    sx_, sy_ = ox + x * scale, oy + y * scale
    key = (int(sx_ // GAP), int(sy_ // GAP))
    near = [q for dx in (-1, 0, 1) for dy in (-1, 0, 1) for q in cell.get((key[0] + dx, key[1] + dy), [])]
    if all(math.dist((sx_, sy_), q) >= GAP for q in near):
        cell.setdefault(key, []).append((sx_, sy_))
        chosen.append((sx_ + DX, sy_, "w"))
pts += chosen

# Launch positions: a loose swarm low over the city behind the stadium; left side flies first.
out = []
for x, y, col in pts:
    sx = 260 + rng.random() * 1400
    sy = 470 + rng.random() * 120
    delay = 0.35 * (x - 380) / 1100 + rng.random() * 0.45
    out.append([round(x, 1), round(y, 1), round(sx, 1), round(sy, 1), round(delay, 3), col])
print(json.dumps(out, separators=(",", ":")))
