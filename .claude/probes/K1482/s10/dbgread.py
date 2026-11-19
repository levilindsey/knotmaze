# K1482 s10: decode patch_dbg.json's frames at chosen pixels.
#   border shot (gf.png):  R = label chain, G = slot over chain + 1 (0 = no baked slot), B = 16 q(loop cut) + q(N cut)
#   fill shot (gf_fill.png): R = loop's outline cutter chain + 1, G = (wm + 0.5) * 100, B = 16 q(margin scale) + q(fade scale)
#   (q(v) = round(15 v); a pixel the composite left unlabelled reads the background)
#   python dbgread.py <dbg dir> <mag.json> <picks per site> <out.json>
import json, sys
import numpy as np
from PIL import Image
d, mp, k, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
B = np.asarray(Image.open(d + "/gf.png").convert("RGB")).astype(int)
F = np.asarray(Image.open(d + "/gf_fill.png").convert("RGB")).astype(int)
mag = json.load(open(mp)); res = {}
for nm, runs in mag.items():
    picks = []
    for r in runs:
        px = sorted(r["px"]); picks.append(px[len(px) // 2])
        if len(px) >= 12 and len(picks) < k: picks.append(px[len(px) // 4])
        if len(picks) >= k: break
    rows = []
    for x, y in picks[:k]:
        b, f = B[y, x], F[y, x]
        rows.append({"px": [x, y], "lab": int(b[0]), "cS": int(b[1]) - 1, "gLoop": (int(b[2]) // 16) / 15, "gN": (int(b[2]) % 16) / 15,
                     "cutter": int(f[0]) - 1, "wm": int(f[1]) / 100 - 0.5, "scM": (int(f[2]) // 16) / 15, "scF": (int(f[2]) % 16) / 15, "rawB": b.tolist(), "rawF": f.tolist()})
    res[nm] = {"c": None, "px": [r["px"] for r in rows], "rows": rows}
    for r in rows: print(nm, r["px"], "lab", r["lab"], "slot over", r["cS"], "loop %.2f N %.2f" % (r["gLoop"], r["gN"]), "cutter", r["cutter"], "wm %.2f" % r["wm"], "sc %.2f/%.2f" % (r["scM"], r["scF"]), r["rawB"], r["rawF"])
json.dump(res, open(out, "w"))
