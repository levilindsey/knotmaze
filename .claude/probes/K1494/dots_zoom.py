# K1494 (27C): tight zooms centred on recorded dot pixels (dotAt, device px), today | gf | gf with dots marked.
#   python .claude/probes/K1494/dots_zoom.py <fadeDir> <fl> <out.png>
# Uses the top 5 dot sides at that fl, first 2 dots each (max 5 rows). Window 15 device px half-width, 8x nearest.
import json, sys
import numpy as np
from PIL import Image, ImageDraw

fadeDir, fl, out = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(f"{fadeDir}/fade_fl{fl}.json"))
sides = [s for s in data["sides"] if s.get("dots", {}).get("gf", 0) > 2]
sides.sort(key=lambda s: -s["dots"]["gf"])
today = Image.open(f"{fadeDir}/shot_today_{fl}.png").convert("RGB")
gf = Image.open(f"{fadeDir}/shot_gf_{fl}.png").convert("RGB")
ta = np.asarray(today).astype(np.int32); ga = np.asarray(gf)
HALF, ZOOM = 15, 8
cell = (HALF * 2 + 1) * ZOOM
rows = []
for s in sides[:5]:
    for (x, y) in s.get("dotAt", {}).get("gf", [])[:1]:
        rows.append((s, x, y))
W, H = 3 * (cell + 4) + 4, len(rows) * (cell + 4) + 20
sheet = Image.new("RGB", (W, H), (34, 34, 34))
dr = ImageDraw.Draw(sheet)
for ci, lab in enumerate(["today", "gf", "gf dots red"]):
    dr.text((4 + ci * (cell + 4), 4), f"fl={fl} {lab}", fill=(220, 220, 220))
for ri, (s, x, y) in enumerate(rows):
    box = (x - HALF, y - HALF, x + HALF + 1, y + HALF + 1)
    sheet.paste(today.crop(box).resize((cell, cell), Image.NEAREST), (4, 20 + ri * (cell + 4)))
    sheet.paste(gf.crop(box).resize((cell, cell), Image.NEAREST), (4 + (cell + 4), 20 + ri * (cell + 4)))
    ov = ga[box[1]:box[3], box[0]:box[2]].copy()
    # mark every pixel in window that spikes like a dot in RGB terms: gf brighter than 4-neighbour mean by >30 in max channel
    p = np.pad(ga.astype(np.int32), ((1, 1), (1, 1), (0, 0)), mode="edge")
    m4 = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4.0
    spike = np.abs(ga.astype(np.int32) - m4).max(axis=2) > 30
    sub = spike[box[1]:box[3], box[0]:box[2]]
    ov[sub] = [255, 0, 0]
    sheet.paste(Image.fromarray(ov).resize((cell, cell), Image.NEAREST), (4 + 2 * (cell + 4), 20 + ri * (cell + 4)))
    dr.text((6, 22 + ri * (cell + 4)), f"x{s['ci']} dot({x},{y}) n={s['dots']['gf']}", fill=(255, 255, 0))
    print(f"x{s['ci']} side{s['side']} at{s['at']} dot dev({x},{y}) gf={tuple(int(v) for v in ga[y,x])} today={tuple(int(v) for v in ta[y,x])}")
sheet.save(out)
print("wrote", out)
