# K1492: the fade sheet. Rows = crossing sides (under thread's end beside an over thread), columns = master at
# fl 0 | 0.14 | 1.2, then tip at the same three; border look, 4x nearest, contrast stretched (the border look's
# outlines are dim on a dark ground: levels 10..60 map to 0..255).
#   python sheet.py <masterDir> <tipDir> <out.png> [sites=104:1,63:1,2:-1,26:-1,97:1,101:1] [prefix=b]
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

md, td, out = sys.argv[1:4]
sites = [tuple(map(int, s.split(":"))) for s in (sys.argv[4] if len(sys.argv) > 4 else "104:1,63:1,2:-1,26:-1,97:1,101:1").split(",")]
pre = sys.argv[5] if len(sys.argv) > 5 else "b"
g = json.load(open(f"{md}/geo.json"))
ppw = g["pxPerWorld"]
R, Z, LBW, HDR = 34, 4, 150, 40
FLS = ["0", "0.14", "1.2"]
cols = [(md, v, "master") for v in FLS] + [(td, v, "tip") for v in FLS]
ims = {(d, v): np.asarray(Image.open(f"{d}/{pre}_fl{v}.png").convert("RGB")).astype(np.float32) for d, v, _ in cols}
T = 2 * R * Z
W = LBW + len(cols) * (T + 6)
H = HDR + len(sites) * (T + 6)
sheet = Image.new("RGB", (W, H), (235, 235, 235))
dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype("arial.ttf", 15)
except Exception: font = ImageFont.load_default()
for k, (d, v, who) in enumerate(cols):
    dr.text((LBW + k * (T + 6) + 6, 10), f"{who}, fade {v}", fill=(0, 0, 0), font=font)
for r, (ci, sd) in enumerate(sites):
    s = next(x for x in g["sides"] if x["ci"] == ci and x["side"] == sd)
    # centre the tile on the under thread 0.55 world past the crossing, so the over thread and the ramp both show
    i = min(len(s["prof"]) - 1, int(0.55 / 0.01))
    cx, cy = int(round(s["prof"][i][1])), int(round(s["prof"][i][2]))
    y0 = HDR + r * (T + 6)
    dr.text((6, y0 + 8), f"crossing x{ci}", fill=(0, 0, 0), font=font)
    dr.text((6, y0 + 28), f"{'+' if sd > 0 else '-'} side of the over", fill=(0, 0, 0), font=font)
    for k, (d, v, who) in enumerate(cols):
        a = ims[(d, v)][cy - R:cy + R, cx - R:cx + R]
        if pre == "b": a = np.clip((a - 10) * 255 / 50, 0, 255)
        tile = Image.fromarray(a.astype(np.uint8)).resize((T, T), Image.NEAREST)
        sheet.paste(tile, (LBW + k * (T + 6), y0))
dr.text((6, H - 18 if False else 22), "", fill=(0, 0, 0))
sheet.save(out)
print(out, sheet.size)
