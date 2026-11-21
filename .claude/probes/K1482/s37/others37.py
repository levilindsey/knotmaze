# K1482 s37: several places on one sheet, one row per place: before | candidate as drawn, then both
# contrast-stretched (stage 36's fixed stretch: (v - LO) * K), nearest-neighbour zoom, at most 1800 px wide.
#   python others37.py <out.png> <label>=<x>,<y>,<before.png>,<candidate.png> [...]
#   env R=48 (half window, device px)  Z=4  LO=14 K=7
import os, sys
from PIL import Image, ImageDraw

out = sys.argv[1]
R, Z = int(os.environ.get("R", 48)), int(os.environ.get("Z", 4))
LO, K = float(os.environ.get("LO", 14)), float(os.environ.get("K", 7))
st = lambda im: im.point(lambda v: max(0, min(255, round((v - LO) * K))))
rows = []
for a in sys.argv[2:]:
    lab, rest = a.split("=", 1)
    x, y, bp, cp = rest.split(",")
    rows.append((lab, int(float(x)), int(float(y)), bp, cp))
T = 2 * R * Z; G = 6
sheet = Image.new("RGB", (4 * T + 3 * G + 8, len(rows) * (T + 34) + 8), (255, 255, 255))
dr = ImageDraw.Draw(sheet)
cache = {}
op = lambda p: cache.setdefault(p, Image.open(p).convert("RGB"))
for r, (lab, x, y, bp, cp) in enumerate(rows):
    B, C = op(bp), op(cp)
    y0 = 4 + r * (T + 34)
    dr.text((4, y0), f"{lab}   centre {x},{y} device px, {2 * R} px window x{Z}", fill=(160, 0, 0))
    for c, (cl, im) in enumerate((("before (as drawn)", B), ("candidate (as drawn)", C), ("before (stretched)", st(B)), ("candidate (stretched)", st(C)))):
        px = 4 + c * (T + G)
        dr.text((px + 2, y0 + 14), cl, fill=(0, 0, 0))
        sheet.paste(im.crop((x - R, y - R, x + R, y + R)).resize((T, T), Image.NEAREST), (px, y0 + 28))
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
sheet.save(out)
print(out, sheet.size)
