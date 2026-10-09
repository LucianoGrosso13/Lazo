#!/usr/bin/env python3
"""Drone formation for compositions/s09b-drones.html: the Lazo prism + "LAZO" in dots.

Recreates the stadium drone-show meme on assets/plate/estadio-sin-logo.jpg (the original logo
was painted out of the sky). Choreography data per drone: launch spot inside the stadium, a
slot in a hovering grid, and the final spot on the logo. Letters are hollow, like a real drone
show: dots are spaced evenly along each glyph outline. Everything random is seeded here, so the
composition stays deterministic.

Usage: python3 scripts/build-drones.py
  → prints JSON [[x, y, gridX, gridY, launchX, launchY, colour, beamOrder], ...]
  colour: "w" white, "v"/"c"/"g" ray colours, or "#rrggbb" for the letter gradient
  beamOrder: 0..1 position along the light path (beam → prism → rays), -1 for letters
"""
import json, math, random
from PIL import Image, ImageDraw, ImageFont

FONT = ("/System/Library/Fonts/Avenir Next.ttc", 0)  # face 0 = Bold
GAP = 10.5  # px between neighbouring drones on a stroke
DX = 64  # shift the whole formation so it centres over the stadium
STOPS = [(0.0, (153, 69, 255)), (0.5, (0, 194, 255)), (1.0, (25, 251, 155))]  # Prisma violet → cyan → green
rng = random.Random(7)
pts = []  # [x, y, colour, beamOrder]


def seg(a, b, col, o0=-1.0, o1=-1.0, step=GAP):
    n = max(1, round(math.dist(a, b) / step))
    for i in range(n + 1):
        t = i / n
        order = -1.0 if o0 < 0 else o0 + (o1 - o0) * t
        pts.append([a[0] + (b[0] - a[0]) * t + DX, a[1] + (b[1] - a[1]) * t, col, order])


# Prism (apex up) with its inner edge, the white beam in and three rays fanning out, as in the logo.
apex, bl, br = (560, 112), (446, 308), (674, 308)
seg((330, 258), (503, 210), "w", 0.0, 0.35)
for a, b in ((apex, bl), (bl, br), (br, apex)):
    seg(a, b, "w", 0.35, 0.6)
seg(apex, (600, 308), "w", 0.35, 0.6, GAP * 1.1)
for (ex, ey), col in (((742, 166), "v"), ((750, 212), "c"), ((742, 258), "g")):
    seg((622, 212), (ex, ey), col, 0.6, 1.0)

# "LAZO": trace the glyph outlines into chains and resample them at an even spacing.
font = ImageFont.truetype(FONT[0], 300, index=FONT[1])
img = Image.new("L", (1200, 400), 0)
ImageDraw.Draw(img).text((0, 0), "LAZO", font=font, fill=255)
img = img.crop(img.getbbox())
w, h = img.size
scale = 180 / h  # cap height on screen
ox, oy = 818, 120
px = img.load()
inside = lambda x, y: 0 <= x < w and 0 <= y < h and px[x, y] > 127
edge = {(x, y) for y in range(h) for x in range(w)
        if inside(x, y) and not all(inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
NB = [(dx, dy) for r in (1, 2) for dx in range(-r, r + 1) for dy in range(-r, r + 1) if max(abs(dx), abs(dy)) == r]
chains = []
while edge:
    cur = min(edge)
    edge.discard(cur)
    chain = [cur]
    while True:
        nxt = next(((cur[0] + dx, cur[1] + dy) for dx, dy in NB if (cur[0] + dx, cur[1] + dy) in edge), None)
        if nxt is None:
            break
        edge.discard(nxt)
        chain.append(nxt)
        cur = nxt
    if len(chain) > 6:
        chains.append(chain)
letters = []
for chain in chains:
    if math.dist(chain[0], chain[-1]) < 4:
        chain = chain + [chain[0]]
    acc, last, step = GAP / scale, chain[0], GAP / scale
    letters.append(chain[0])
    for p in chain[1:]:
        acc_d = math.dist(last, p)
        acc -= acc_d
        last = p
        if acc <= 0:
            letters.append(p)
            acc = step
for x, y in letters:
    sx, sy = ox + x * scale + DX, oy + y * scale
    if all(math.dist((sx, sy), (q[0], q[1])) >= GAP * 0.72 for q in pts[-60:] if q[3] < 0):
        if all(math.dist((sx, sy), (q[0], q[1])) >= GAP * 0.72 for q in pts if q[3] < 0):
            pts.append([sx, sy, "L", -1.0])

# Letter gradient across the word.
lx = [p[0] for p in pts if p[2] == "L"]
x0, x1 = min(lx), max(lx)


def grad(t):
    for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            return "#%02x%02x%02x" % tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
    return "#%02x%02x%02x" % STOPS[-1][1]


for p in pts:
    if p[2] == "L":
        p[2] = grad((p[0] - x0) / (x1 - x0))

# Hover grid: a flat block of rows over the stadium; slots assigned by x so the morph flows sideways.
n = len(pts)
cols = math.ceil(math.sqrt(n * 3.2))
rows = math.ceil(n / cols)
cell = 21
gx0, gy0 = 960 - (cols - 1) * cell / 2, 250 - (rows - 1) * cell / 2
slots = sorted(((gx0 + c * cell, gy0 + r * cell) for c in range(cols) for r in range(rows)), key=lambda s: (s[0], s[1]))[:n]
order = sorted(range(n), key=lambda i: (pts[i][0], pts[i][1]))

out = [None] * n
for slot, i in zip(slots, order):
    x, y, col, beam = pts[i]
    a = rng.random() * math.tau
    r = math.sqrt(rng.random())
    lx_, ly_ = 950 + math.cos(a) * 470 * r, 835 + math.sin(a) * 48 * r  # inside the stadium bowl
    out[i] = [round(x, 1), round(y, 1), round(slot[0], 1), round(slot[1], 1), round(lx_, 1), round(ly_, 1), col, round(beam, 3)]
print(json.dumps(out, separators=(",", ":")))
