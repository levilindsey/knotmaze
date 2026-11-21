# K1482 s37: ONE place on one sheet, before | candidate, at two zooms (with the surrounding threads, then close),
# each as drawn and contrast-stretched (stage 36's fixed stretch: (v - LO) * K), nearest-neighbour zoom, at most
# 1800 px wide. Row 1 = the wide zoom, row 2 = the close one; columns: before (as drawn), candidate (as drawn),
# before (stretched), candidate (stretched). A red frame on the wide tiles marks the close window.
#   python place37.py <out.png> <title> <x> <y> <before.png> <candidate.png>
#   env RW=110 ZW=2 (wide half window px, zoom)  RC=36 ZC=6 (close)  LO=14 K=7
import os, sys
from PIL import Image, ImageDraw

out, title, x, y, bp, cp = sys.argv[1:7]
x, y = int(float(x)), int(float(y))
RW, ZW = int(os.environ.get("RW", 110)), int(os.environ.get("ZW", 2))
RC, ZC = int(os.environ.get("RC", 36)), int(os.environ.get("ZC", 6))
LO, K = float(os.environ.get("LO", 14)), float(os.environ.get("K", 7))
B, C = Image.open(bp).convert("RGB"), Image.open(cp).convert("RGB")
st = lambda im: im.point(lambda v: max(0, min(255, round((v - LO) * K))))
cols = [("before (as drawn)", B), ("candidate (as drawn)", C), ("before (stretched)", st(B)), ("candidate (stretched)", st(C))]
TW, TC = 2 * RW * ZW, 2 * RC * ZC
T = max(TW, TC); G = 6
sheet = Image.new("RGB", (4 * T + 3 * G + 8, 2 * (T + 18) + 26), (255, 255, 255))
dr = ImageDraw.Draw(sheet)
dr.text((4, 4), f"{title}   centre {x},{y} device px   row 1: {2 * RW} px window x{ZW}, row 2: {2 * RC} px window x{ZC}", fill=(160, 0, 0))
for r, (R, Z) in enumerate(((RW, ZW), (RC, ZC))):
    for c, (lab, im) in enumerate(cols):
        px, py = 4 + c * (T + G), 22 + r * (T + 18)
        dr.text((px + 2, py), lab, fill=(0, 0, 0))
        tile = im.crop((x - R, y - R, x + R, y + R)).resize((2 * R * Z, 2 * R * Z), Image.NEAREST)
        if r == 0:
            d2 = ImageDraw.Draw(tile); o = (RW - RC) * ZW
            d2.rectangle([o, o, o + 2 * RC * ZW, o + 2 * RC * ZW], outline=(255, 40, 40), width=1)
        sheet.paste(tile, (px, py + 14))
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
sheet.save(out)
print(out, sheet.size)
