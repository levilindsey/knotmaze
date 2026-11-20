# K1525 s1: attribute the dive faults to the look's terms. For each dive box, the px where master gf is darker than
# today's ("gf dark") and where today's is darker ("today dark"), with the debug build's d5 (slot chain cS, the chain
# whose cut won the coverage, in-window) and d1 (coverage cut gA, outline cut g, source 1 piece loop / 2 far reach).
#   python dbgread.py <today dir> <gf dir> <dbg dir> <fl> [dist]
import sys, os, collections
import numpy as np
from PIL import Image
td, gd, dd, fl = sys.argv[1:5]; dist = float(sys.argv[5]) if len(sys.argv) > 5 else 60
D = 76
DIVES = [("dive 1", 1968, 432), ("dive 2", 2224, 976), ("dive 3", 1904, 1136), ("dive 4", 1248, 1104)]
L = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int)
T = L(os.path.join(td, f"f_fl{fl}.png")); G = L(os.path.join(gd, f"f_fl{fl}.png"))
d1 = L(os.path.join(dd, f"d1_fl{fl}.png")); d5 = L(os.path.join(dd, f"d5_fl{fl}.png"))
for name, cx, cy in DIVES:
    sl = (slice(cy - D // 2, cy + D // 2), slice(cx - D // 2, cx + D // 2))
    lt = T[sl].sum(-1) / 3; lg = G[sl].sum(-1) / 3
    for cls, m in (("gf dark", lt - lg > dist), ("today dark", lg - lt > dist)):
        n = int(m.sum())
        if not n: print(f"{name} fl {fl} {cls}: 0"); continue
        c = collections.Counter()
        for (y, x) in zip(*np.nonzero(m)):
            r, g, b = d5[sl][y, x]; a1 = d1[sl][y, x]
            src = int(round(a1[2] / 127.5))
            c[(r - 1, g - 1, int(b > 127), src)] += 1
        ga = d1[sl][..., 0][m].mean() / 255; gg = d1[sl][..., 1][m].mean() / 255
        top = ", ".join(f"cS {k[0]} cut {k[1]} win {k[2]} src {k[3]}: {v}" for k, v in c.most_common(5))
        print(f"{name} fl {fl} {cls}: {n} px, mean gA {ga:.2f} g {gg:.2f}; {top}")
