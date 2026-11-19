# K1482 s8: islands (dark-ink components inside a site's box that touch neither the box edge nor a larger stroke) at
# the GAP sites, today | master gf | tip gf, same physics hash.   python islands.py <raw> <out.txt>   env TH=73 RB=20
import sys, json, numpy as np
from PIL import Image
import os; R = sys.argv[1]; TH = int(os.environ.get("TH", 73)); RB = int(os.environ.get("RB", 20)); MAXI = 80
S = {s["site"]: s for s in json.load(open(R + "/tB/sites_gf.json"))["sites"]}
F = {"today": R + "/m/today.png", "master": R + "/mF/gf_fls0.14.png", "tip": R + "/tB/gf_fls0.14.png"}
I = {k: np.asarray(Image.open(p).convert("RGB")).astype(int).sum(-1) <= TH for k, p in F.items()}
def comps(m):
    pts = set(zip(*np.nonzero(m))); out = []
    while pts:
        st = [pts.pop()]; c = []
        while st:
            y, x = st.pop(); c.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    q = (y + dy, x + dx)
                    if q in pts: pts.remove(q); st.append(q)
        out.append(c)
    return out
def islands(m, x, y):
    b = m[y - RB:y + RB, x - RB:x + RB]; n = 0; px = 0
    for c in comps(b):
        ys = [p[0] for p in c]; xs = [p[1] for p in c]
        if min(ys) > 0 and min(xs) > 0 and max(ys) < 2 * RB - 1 and max(xs) < 2 * RB - 1 and len(c) <= MAXI: n += 1; px += len(c)
    return n, px
sites = ["j2", "t1s", "t24s", "t46e", "t39s", "j88", "j49", "j55", "j87", "j36", "t79s", "j22", "j29", "t65s", "t80s", "t81s", "t70s"]
L = ["# TH %d: site  islands (n/px) in a %dx%d box: today | master gf | tip gf   (frames: m/today.png, mF + tB gf_fls0.14.png, hash fff8c9e5)" % (TH, 2 * RB, 2 * RB)]
for s in sites:
    x, y = int(S[s]["x"]), int(S[s]["y"]); r = [islands(I[k], x, y) for k in ("today", "master", "tip")]
    L.append("%-5s %s" % (s, "  ".join("%d/%d" % v for v in r)))
open(sys.argv[2], "w").write("\n".join(L) + "\n"); print("\n".join(L))
