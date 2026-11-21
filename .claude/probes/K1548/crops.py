# K1548 (27H): 4x crops with surroundings at the three 1de01c120 sides with the most OLD-rule dots.
#   python .claude/probes/K1548/crops.py <fadeDir> <fl> <out.png> [topN] [halfCss]
# Tiles per side: today | gf | gf marked (OLD-rule counted px red, NEW-rule counted px cyan; a px counted
# by both stays red). Centred on the crossing (at, CSS px; DSF 2), halfCss of surroundings, NEAREST 4x.
import json, sys
from PIL import Image, ImageDraw

fadeDir, fl, out = sys.argv[1], sys.argv[2], sys.argv[3]
topN = int(sys.argv[4]) if len(sys.argv) > 4 else 3
half = int(sys.argv[5]) if len(sys.argv) > 5 else 60
DSF, ZOOM = 2, 4
data = json.load(open(f"{fadeDir}/fade_fl{fl}.json"))
sides = [s for s in data["sides"] if s.get("dotsOld", {}).get("gf", 0) > 2]
sides.sort(key=lambda s: -s["dotsOld"]["gf"])
pick = sides[:topN]
print(f"fl={fl}: {len(sides)} sides >2 OLD dots; top {len(pick)}: " +
      " ".join(f"x{s['ci']}{'+' if s['side'] > 0 else '-'}@{s['at']}:old={s['dotsOld']['gf']} new={s['dots']['gf']}" for s in pick))
today = Image.open(f"{fadeDir}/shot_today_{fl}.png").convert("RGB")
gf = Image.open(f"{fadeDir}/shot_gf_{fl}.png").convert("RGB")
cell = half * 2 * ZOOM
W, H = 3 * (cell + 4) + 4, len(pick) * (cell + 4) + 20
sheet = Image.new("RGB", (W, H), (34, 34, 34))
dr = ImageDraw.Draw(sheet)
for ci, lab in enumerate(["today", "gf", "gf marked (red=old, cyan=new)"]):
    dr.text((4 + ci * (cell + 4), 4), f"fl={fl} {lab}", fill=(220, 220, 220))
for ri, s in enumerate(pick):
    cx, cy = s["at"][0] * DSF, s["at"][1] * DSF
    box = (cx - half * DSF, cy - half * DSF, cx + half * DSF, cy + half * DSF)
    for ci, im in enumerate([today, gf]):
        sheet.paste(im.crop(box).resize((cell, cell), Image.NEAREST), (4 + ci * (cell + 4), 20 + ri * (cell + 4)))
    marked = gf.crop(box).copy()
    md = ImageDraw.Draw(marked)
    newXY = {(f[0], f[1]) for f in s.get("dotFeat", {}).get("gf", [])}
    for (x, y) in s.get("dotOldXY", {}).get("gf", []):
        md.point((x - box[0], y - box[1]), fill=(255, 0, 0))
    for (x, y) in newXY:
        if (x, y) not in {(a, b) for a, b in s.get("dotOldXY", {}).get("gf", [])}:
            md.point((x - box[0], y - box[1]), fill=(0, 255, 255))
    sheet.paste(marked.resize((cell, cell), Image.NEAREST), (4 + 2 * (cell + 4), 20 + ri * (cell + 4)))
    dr.text((6, 22 + ri * (cell + 4)), f"x{s['ci']}{'+' if s['side'] > 0 else '-'} old={s['dotsOld']['gf']} new={s['dots']['gf']}", fill=(255, 255, 0))
sheet.save(out)
print("wrote", out)
