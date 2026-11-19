# K1482 s11: per-site ink change between two frames of one physics state. For each site in the sites file, the dark-ink
# pixels (RGB sum <= TH) gained and lost inside its 2R x 2R box (R=24, the 4x tile's window). Prints sites over MIN px
# changed (gain + loss), worst first, and the count; writes the full table as JSON when asked.
#   python boxdiff.py <a.png> <b.png> <sites.json> [out.json] [env R=24 TH=73 MIN=9]
import json, os, sys
import numpy as np
from PIL import Image
a, b, sp = sys.argv[1:4]
R = int(os.environ.get("R", 24)); TH = int(os.environ.get("TH", 73)); MIN = int(os.environ.get("MIN", 9))
A = np.asarray(Image.open(a).convert("RGB")).astype(int).sum(-1) <= TH
B = np.asarray(Image.open(b).convert("RGB")).astype(int).sum(-1) <= TH
S = json.load(open(sp))["sites"]
rows = []
for s in S:
    cx, cy = round(s["x"]), round(s["y"])
    if cx - R < 0 or cy - R < 0 or cx + R > A.shape[1] or cy + R > A.shape[0]: rows.append((s["site"], -1, -1)); continue
    a_ = A[cy - R:cy + R, cx - R:cx + R]; b_ = B[cy - R:cy + R, cx - R:cx + R]
    rows.append((s["site"], int((b_ & ~a_).sum()), int((a_ & ~b_).sum())))
big = [r for r in rows if r[1] + r[2] > MIN]
big.sort(key=lambda r: -(r[1] + r[2]))
print("sites", len(rows), "off-frame", sum(1 for r in rows if r[1] < 0), "over", MIN, "px:", len(big), "| ink a", int(A.sum()), "b", int(B.sum()))
for r in big: print("%-6s gain %4d loss %4d" % r)
if len(sys.argv) > 4: json.dump({r[0]: [r[1], r[2]] for r in rows}, open(sys.argv[4], "w"))
