# K1495: a tile sheet. Rows = crossing sides, columns = (dir/prefix, fl, label); 4x nearest, centred on the under
# thread 0.55 world past the crossing (K1492's sheet.py). Border-look tiles (prefix b) get K1492's contrast stretch
# (levels 10..60 -> 0..255) unless STRETCH=0.
#   python sheet2.py <geoDir> <out.png> <sites ci:side,...> "<dir>/<prefix>|<fl>|<label>" ... [--title "..."]
import json, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
title = None
if "--title" in args:
    i = args.index("--title"); title = args[i + 1]; args = args[:i] + args[i + 2:]
gdir, out, sites = args[0], args[1], [tuple(map(int, s.split(":"))) for s in args[2].split(",")]
cols = [c.split("|") for c in args[3:]]
g = json.load(open(f"{gdir}/geo.json"))
R, Z, LBW = 34, 4, 150
HDR = 40 + (24 if title else 0)
STRETCH = os.environ.get("STRETCH", "1") == "1"
ims = {}
for path, v, _ in cols:
    d, pre = path.rsplit("/", 1)
    ims[(path, v)] = np.asarray(Image.open(f"{d}/{pre}_fl{v}.png").convert("RGB")).astype(np.float32)
T = 2 * R * Z
W = LBW + len(cols) * (T + 6)
H = HDR + len(sites) * (T + 6)
sheet = Image.new("RGB", (W, H), (235, 235, 235))
dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype("arial.ttf", 15); big = ImageFont.truetype("arial.ttf", 18)
except Exception: font = big = ImageFont.load_default()
if title: dr.text((6, 6), title, fill=(0, 0, 0), font=big)
for k, (path, v, lab) in enumerate(cols):
    for li, line in enumerate(lab.split("\\n")):
        dr.text((LBW + k * (T + 6) + 6, HDR - 38 + li * 18), line, fill=(0, 0, 0), font=font)
for r, (ci, sd) in enumerate(sites):
    s = next(x for x in g["sides"] if x["ci"] == ci and x["side"] == sd)
    i = min(len(s["prof"]) - 1, int(0.55 / 0.01))
    cx, cy = int(round(s["prof"][i][1])), int(round(s["prof"][i][2]))
    y0 = HDR + r * (T + 6)
    dr.text((6, y0 + 8), f"crossing x{ci}", fill=(0, 0, 0), font=font)
    dr.text((6, y0 + 28), f"{'+' if sd > 0 else '-'} side of the over", fill=(0, 0, 0), font=font)
    for k, (path, v, lab) in enumerate(cols):
        a = ims[(path, v)][cy - R:cy + R, cx - R:cx + R]
        if STRETCH and path.rsplit("/", 1)[1].startswith("b"): a = np.clip((a - 10) * 255 / 50, 0, 255)
        tile = Image.fromarray(a.astype(np.uint8)).resize((T, T), Image.NEAREST)
        sheet.paste(tile, (LBW + k * (T + 6), y0))
sheet.save(out)
print(out, sheet.size)
