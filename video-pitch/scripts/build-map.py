#!/usr/bin/env python3
"""Argentina outline (mainland + Malvinas) and merchant dots for compositions/s08-pedido.html.

Source: Natural Earth 1:50m via world-atlas@2 (countries-50m.json, the same data the registry
world-map block loads at runtime). The render must not hit the network, so the paths are baked.

Usage: python3 scripts/build-map.py <countries-50m.json>  → prints JSON {w, h, d, dots}
"""
import json, math, sys

W = 300  # output width in px; height follows the projection
LAT0 = -38.0  # equirectangular, x scaled by cos(LAT0) so the shape is not stretched
IDS = ("032", "238")  # Argentina, Islas Malvinas
MIN_RING_KM2 = 300  # drop tiny islets that would only add noise
CITIES = [  # merchant dots (illustrative, one per region), lat, lon
    ("Jujuy", -24.19, -65.30), ("Salta", -24.78, -65.41), ("Tucumán", -26.82, -65.22),
    ("Posadas", -27.37, -55.90), ("Resistencia", -27.45, -58.99), ("Santiago del Estero", -27.78, -64.26),
    ("Córdoba", -31.42, -64.18), ("Rosario", -32.95, -60.65), ("San Juan", -31.54, -68.53),
    ("Mendoza", -32.89, -68.85), ("Buenos Aires", -34.60, -58.38), ("Santa Rosa", -36.62, -64.29),
    ("Mar del Plata", -38.00, -57.56), ("Bahía Blanca", -38.72, -62.27), ("Neuquén", -38.95, -68.06),
    ("Bariloche", -41.13, -71.31), ("Comodoro Rivadavia", -45.86, -67.48), ("Río Gallegos", -51.62, -69.22),
    ("Ushuaia", -54.80, -68.30),
]

topo = json.load(open(sys.argv[1]))
sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]
arcs = []
for arc in topo["arcs"]:
    x = y = 0
    pts = []
    for dx, dy in arc:
        x += dx
        y += dy
        pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)


def ring(idx):
    pts = []
    for a in idx:
        seg = arcs[a] if a >= 0 else arcs[~a][::-1]
        pts.extend(seg if not pts else seg[1:])
    return pts


def area_km2(pts):
    k = math.cos(math.radians(LAT0)) * 111.32 * 110.57
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))) / 2 * k


rings = []
for g in topo["objects"]["countries"]["geometries"]:
    if g.get("id") not in IDS:
        continue
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    for poly in polys:
        outer = ring(poly[0])
        if area_km2(outer) >= MIN_RING_KM2:
            rings.append(outer)

c = math.cos(math.radians(LAT0))
xs = [p[0] * c for r in rings for p in r]
ys = [-p[1] for r in rings for p in r]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
k = W / (x1 - x0)
H = round((y1 - y0) * k)
proj = lambda lon, lat: (round((lon * c - x0) * k, 1), round((-lat - y0) * k, 1))

d = " ".join("M" + " L".join(f"{proj(*p)[0]} {proj(*p)[1]}" for p in r) + " Z" for r in rings)
dots = [{"name": n, "x": proj(lon, lat)[0], "y": proj(lon, lat)[1]} for n, lat, lon in CITIES]
print(json.dumps({"w": W, "h": H, "d": d, "dots": dots}))
