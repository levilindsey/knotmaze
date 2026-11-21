# K1548 (27U) Done 6: one sheet, the control place (the 1de side with the most NEW-rule dots at
# fl=1.2) on 1de01c120 | a8d36be33 | master, gf fl=1.2 shots with each build's counted pixels
# marked (NEW red, OLD-only yellow), surroundings then 4x close. <=1800 px wide.
#   python .claude/probes/K1548/sheet27u.py
import json
from PIL import Image, ImageDraw

RUNS = [("fadeA_1de_1", "1de01c120"), ("fadeA_a8d_1", "a8d36be33"), ("fadeA_master_1", "master")]
FL = "1.2"; DSF = 2

def load(run):
    return json.load(open(f".claude/probes/K1548/out/27U/{run}/fade_fl{FL}.json"))

d0 = load(RUNS[0][0])
top = max(d0["sides"], key=lambda s: s["dots"]["gf"])
ci, side, at = top["ci"], top["side"], top["at"]
print(f"control place x{ci}{'+' if side > 0 else '-'}@{at} NEW dots per build:",
      {name: next(s["dots"]["gf"] for s in load(r)["sides"] if s["ci"] == ci and s["side"] == side) for r, name in RUNS})

HALF = 90  # css px of surroundings
ZOOM = 3
cellW = HALF * 2 * DSF
rows = []
for run, name in RUNS:
    d = load(run)
    s = next(s for s in d["sides"] if s["ci"] == ci and s["side"] == side)
    im = Image.open(f".claude/probes/K1548/out/27U/{run}/shot_gf_{FL}.png").convert("RGB")
    cx, cy = at[0] * DSF, at[1] * DSF
    box = (cx - HALF * DSF, cy - HALF * DSF, cx + HALF * DSF, cy + HALF * DSF)
    tile = im.crop(box).copy()
    dr = ImageDraw.Draw(tile)
    newXY = {(f[0], f[1]) for f in s.get("dotFeat", {}).get("gf", [])} | {(a, b) for a, b in s.get("dotAt", {}).get("gf", [])}
    for (x, y) in s.get("dotOldXY", {}).get("gf", []):
        dr.point((x - box[0], y - box[1]), fill=(255, 220, 0))
    for (x, y) in newXY:
        dr.point((x - box[0], y - box[1]), fill=(255, 0, 0))
    rows.append((name, tile.resize((cellW * ZOOM // 2, cellW * ZOOM // 2), Image.NEAREST), s["dots"]["gf"], s["dotsOld"]["gf"]))

W = 3 * (rows[0][1].width + 4) + 4
H = rows[0][1].height + 28
sheet = Image.new("RGB", (W, H), (30, 30, 30))
dr = ImageDraw.Draw(sheet)
for k, (name, tile, dn, do) in enumerate(rows):
    x = 4 + k * (tile.width + 4)
    dr.text((x + 2, 6), f"{name} fl={FL} gf NEW={dn} OLD={do} (red=NEW, yellow=OLD-only)", fill=(230, 230, 230))
    sheet.paste(tile, (x, 24))
out = ".claude/probes/K1548/out/27U/sheet_control.png"
sheet.save(out)
print("wrote", out, sheet.size)
