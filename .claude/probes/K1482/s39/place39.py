# K1482 s39: ONE changed place on one sheet, before | candidate, two pictures per row, at most 1800 px wide.
# Rows: wide window as drawn, wide window brightened, close window as drawn, close window brightened (stage 36's
# fixed stretch (v - LO) * K). Nearest-neighbour zoom. A red frame on the wide tiles marks the close window.
#   python place39.py <out.png> <title> <x> <y> <before.png> <candidate.png>
#   env RW=100 ZW=4 (wide half window px, zoom)  RC=40 ZC=10 (close)  LO=14 K=7
import os, sys
from PIL import Image, ImageDraw

def sheet(out, title, x, y, bp, cp, B=None, C=None):
    RW, ZW = int(os.environ.get("RW", 100)), int(os.environ.get("ZW", 4))
    RC, ZC = int(os.environ.get("RC", 40)), int(os.environ.get("ZC", 10))
    LO, K = float(os.environ.get("LO", 14)), float(os.environ.get("K", 7))
    B = B or Image.open(bp).convert("RGB"); C = C or Image.open(cp).convert("RGB")
    st = lambda im: im.point(lambda v: max(0, min(255, round((v - LO) * K))))
    T = max(2 * RW * ZW, 2 * RC * ZC); G = 8; H = 16
    W = 2 * T + G + 8
    rows = [("wide, as drawn", RW, ZW, False), ("wide, brightened (x%g)" % K, RW, ZW, True),
            ("close, as drawn", RC, ZC, False), ("close, brightened (x%g)" % K, RC, ZC, True)]
    S = Image.new("RGB", (W, 24 + len(rows) * (T + H + G)), (255, 255, 255))
    dr = ImageDraw.Draw(S)
    dr.text((4, 4), f"{title}   centre {x},{y} device px   wide {2*RW} px x{ZW}, close {2*RC} px x{ZC}", fill=(160, 0, 0))
    for r, (lab, R, Z, bright) in enumerate(rows):
        for c, (nm, im) in enumerate((("before", B), ("candidate", C))):
            px, py = 4 + c * (T + G), 24 + r * (T + H + G)
            dr.text((px + 2, py), f"{nm} - {lab}", fill=(0, 0, 0))
            src = st(im) if bright else im
            tile = src.crop((x - R, y - R, x + R, y + R)).resize((2 * R * Z, 2 * R * Z), Image.NEAREST)
            if R == RW:
                d2 = ImageDraw.Draw(tile); o = (RW - RC) * ZW
                d2.rectangle([o, o, o + 2 * RC * ZW, o + 2 * RC * ZW], outline=(255, 40, 40), width=1)
            S.paste(tile, (px, py + H))
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    S.save(out)
    return S.size

if __name__ == "__main__":
    out, title, x, y, bp, cp = sys.argv[1:7]
    print(out, sheet(out, title, int(float(x)), int(float(y)), bp, cp))
