# K1494 (27C): 4x crops with surroundings at fade.mjs dot sides, today | gf, from one run's shots + fade JSON.
#   python .claude/probes/K1494/crops27c.py <fadeDir> <fl> <out.png> [topN] [halfCss]
# Picks the topN sides by dots.gf at that fl, crops halfCss CSS px around the crossing centre (at, CSS px; DSF 2),
# nearest-neighbour 4x, tiles today | gf | diff(x4, centred 128). Also prints, per side, the RGB of the first
# recorded dot pixel (dotAt, device px) and its 4 neighbours in both shots, so a spike can be told from a gradient.
import json, sys
from PIL import Image, ImageDraw

fadeDir, fl, out = sys.argv[1], sys.argv[2], sys.argv[3]
topN = int(sys.argv[4]) if len(sys.argv) > 4 else 5
half = int(sys.argv[5]) if len(sys.argv) > 5 else 60
DSF, ZOOM = 2, 4
data = json.load(open(f"{fadeDir}/fade_fl{fl}.json"))
sides = [s for s in data["sides"] if s.get("dots", {}).get("gf", 0) > 2]
sides.sort(key=lambda s: -s["dots"]["gf"])
pick = sides[:topN]
print(f"fl={fl}: {len(sides)} sides >2 dots; top {len(pick)}: " +
      " ".join(f"x{s['ci']}{'+' if s['side'] > 0 else '-'}@{s['at']}:{s['dots']['gf']}" for s in pick))
today = Image.open(f"{fadeDir}/shot_today_{fl}.png").convert("RGB")
gf = Image.open(f"{fadeDir}/shot_gf_{fl}.png").convert("RGB")
cell = half * 2 * ZOOM
W, H = 3 * (cell + 4) + 4, len(pick) * (cell + 4) + 20
sheet = Image.new("RGB", (W, H), (34, 34, 34))
dr = ImageDraw.Draw(sheet)
for ci, lab in enumerate(["today", "gf", "diff x4"]):
    dr.text((4 + ci * (cell + 4), 4), f"fl={fl} {lab}", fill=(220, 220, 220))
import numpy as np
ta = np.asarray(today).astype(np.int32); ga = np.asarray(gf).astype(np.int32)
for ri, s in enumerate(pick):
    cx, cy = s["at"][0] * DSF, s["at"][1] * DSF
    box = (cx - half * DSF, cy - half * DSF, cx + half * DSF, cy + half * DSF)
    for ci, im in enumerate([today, gf]):
        sheet.paste(im.crop(box).resize((cell, cell), Image.NEAREST), (4 + ci * (cell + 4), 20 + ri * (cell + 4)))
    d = np.clip((ga[box[1]:box[3], box[0]:box[2]] - ta[box[1]:box[3], box[0]:box[2]]) * 4 + 128, 0, 255).astype(np.uint8)
    sheet.paste(Image.fromarray(d).resize((cell, cell), Image.NEAREST), (4 + 2 * (cell + 4), 20 + ri * (cell + 4)))
    dr.text((6, 22 + ri * (cell + 4)), f"x{s['ci']}{'+' if s['side'] > 0 else '-'} dots={s['dots']['gf']}", fill=(255, 255, 0))
    for (x, y) in s.get("dotAt", {}).get("gf", [])[:2]:
        def px(a, x, y): return tuple(int(v) for v in a[y, x])
        nb = [px(ga, x+1, y), px(ga, x-1, y), px(ga, x, y+1), px(ga, x, y-1)]
        print(f"  x{s['ci']} dot@dev({x},{y}) gf={px(ga,x,y)} nbMean={tuple(round(sum(c[i] for c in nb)/4) for i in range(3))} today={px(ta,x,y)}")
sheet.save(out)
print("wrote", out)
