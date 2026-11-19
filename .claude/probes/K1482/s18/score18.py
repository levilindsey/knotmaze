# K1482 s18: oracle score of a variant capture against its control. Every dark-ink pixel gained (A light >= HI, B ink)
# or lost (A ink, B light >= HI) is a candidate; the field's CPU twin (eval18.mjs at those pixels) says whether the
# reference has ink there: a gain on reference ink or a loss off it is a FIX, the others a REGRESSION.
#   python score18.py pts <A.png> <B.png>... <out_pts.txt>        (union of candidates -> dev coords for eval18.mjs)
#   python score18.py score <eval.txt> <A.png> <B.png> <sites.json> [N]   (per variant: fixes / regressions, worst clusters)
import sys, json, re, numpy as np
from PIL import Image
S_CAP, O_CAP = 42.5937, (834.4773, 135.8598)
def load(p): return np.asarray(Image.open(p).convert("RGB")).astype(int).sum(2)
def cand(a, b, HI=int(__import__("os").environ.get("HI", 74))):
    A, B = load(a), load(b)
    g = np.argwhere((B <= 73) & (A >= HI)); l = np.argwhere((A <= 73) & (B >= HI))
    return [(int(x), int(y), 1) for y, x in g] + [(int(x), int(y), -1) for y, x in l]
def todev(x, y, A):
    wx, wy = (x - O_CAP[0]) / S_CAP, (y - O_CAP[1]) / S_CAP
    return round(wx * A[0] + A[4]), round(wy * A[3] + A[5])
A_DEV = (42.8045, 0, 0, 42.8045, 830.2033, 130.2210)
if sys.argv[1] == "pts":
    *pairs, out = sys.argv[2:]
    a = pairs[0]; pts = set()
    for b in pairs[1:]:
        for x, y, s in cand(a, b): pts.add(todev(x, y, A_DEV))
    open(out, "w").write(";".join("%d,%d" % p for p in sorted(pts))); print(len(pts), "points")
else:
    ev, a, b, sp = sys.argv[2:6]; N = int(sys.argv[6]) if len(sys.argv) > 6 else 15
    ink = {}
    for m in re.finditer(r"^\((\d+),(\d+)\) ink ([\d.]+)", open(ev, encoding="utf-8", errors="ignore").read(), re.M): ink[(int(m[1]), int(m[2]))] = float(m[3])
    S = json.load(open(sp))["sites"]
    fix = reg = miss = 0; bad = []
    for x, y, s in cand(a, b):
        v = ink.get(todev(x, y, A_DEV))
        if v is None: miss += 1; continue
        ok = (v >= 0.5) == (s > 0)
        if ok: fix += 1
        else: reg += 1; bad.append((x, y, s, v))
    print("fix %d reg %d miss %d" % (fix, reg, miss))
    cells = {}
    for x, y, s, v in bad: cells.setdefault((x // 24, y // 24), []).append((x, y))
    rows = sorted(cells.values(), key=len, reverse=True)[:N]
    for r in rows:
        cx = sum(p[0] for p in r) / len(r); cy = sum(p[1] for p in r) / len(r)
        s = min(S, key=lambda s: (s["x"] - cx) ** 2 + (s["y"] - cy) ** 2)
        print("  reg %3d at %d,%d near %s" % (len(r), cx, cy, s["site"]))
