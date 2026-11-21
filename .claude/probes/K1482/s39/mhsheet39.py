# K1482 s39 item 2: sheets for the two muse_hash places the bar's mirror scan lists as gone (world 34.2,18.5 and
# 29.7,23.5), from the border captures of the muse_hash scene on m (start) and c (candidate).
#   python mhsheet39.py   (reads out/s39/raw/{m,c}/muse_hash/, writes out/s39/sheets/muse_hash_w<x>_<y>.png and
#   appends to places.txt)
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
OUT = os.path.normpath(os.path.join(HERE, "..", "out", "s39"))
from place39 import sheet
from PIL import Image, ImageChops
bp = os.path.join(OUT, "raw", "m", "muse_hash", "gf_b2.png"); cp = os.path.join(OUT, "raw", "c", "muse_hash", "gf_b2.png")
sj = json.load(open(os.path.join(OUT, "raw", "c", "muse_hash", "sites_gf.json")))
mj = json.load(open(os.path.join(OUT, "raw", "m", "muse_hash", "sites_gf.json")))
print("hash m", mj["hash"], "c", sj["hash"], "toDevA m", mj["toDevA"], "c", sj["toDevA"])
B = Image.open(bp).convert("RGB"); C = Image.open(cp).convert("RGB")
a, _, _, d, e, f = sj["toDevA"]
for wx, wy in ((34.2, 18.5), (29.7, 23.5)):
    x, y = a * wx + e, d * wy + f
    sp = os.path.join(OUT, "sheets", f"muse_hash_w{wx}_{wy}.png")
    sheet(sp, f"muse_hash world {wx},{wy}", int(round(x)), int(round(y)), bp, cp, B, C)
    r = 24; box = (int(x) - r, int(y) - r, int(x) + r, int(y) + r)
    diff = ImageChops.difference(B.crop(box), C.crop(box)).convert("L")
    n = sum(1 for p in diff.getdata() if p >= 1)
    print(f"world {wx},{wy} -> device {x:.0f},{y:.0f}: {n} px differ (step >= 1) in the {2*r} px box; sheet {sp}")
    with open(os.path.join(OUT, "places.txt"), "a", encoding="utf-8") as fo:
        fo.write(f"muse_hash\t{x:.0f},{y:.0f}\t{n} px changed in a 48 px box\t(world {wx},{wy})\t{sp}\n")
