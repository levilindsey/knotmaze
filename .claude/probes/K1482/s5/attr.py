# K1482 s5: which look-gap term leaves each fragment. Per site: ink in the box for the tip (t_h1) and for each shader
# variant (cap.mjs PATCH, s5/patch/*.json), and the ink a variant removes (A-only) / adds (B-only) vs the tip.
#   python s5/attr.py <sites.json> <base.png> <classes.txt> name=png ...   env R=18 TH=73
import json, os, sys
import numpy as np
from PIL import Image
def binary_dilation(x):
    y = x.copy(); y[1:] |= x[:-1]; y[:-1] |= x[1:]; z = y.copy(); z[:, 1:] |= y[:, :-1]; z[:, :-1] |= y[:, 1:]; return z
R = int(os.environ.get("R", 18)); TH = int(os.environ.get("TH", 73))
sites = {s["site"]: s for s in json.load(open(sys.argv[1]))["sites"]}
ink = lambda f: np.asarray(Image.open(f).convert("RGB")).astype(int).sum(2) <= TH
B = ink(sys.argv[2])
cls = {}
for l in open(sys.argv[3]):
    p = l.split()
    if len(p) >= 2 and not l.startswith("#"): cls[p[0]] = p[1]
V = [(a.split("=")[0], ink(a.split("=")[1])) for a in sys.argv[4:]]
print("site  class  ink " + " ".join(f"{n:>13}" for n, _ in V) + "   (variant: -removed/+added px)")
for k, c in cls.items():
    s = sites.get(k)
    if not s or s.get("x") is None: continue
    x, y = int(round(s["x"])), int(round(s["y"])); sl = (slice(max(0, y - R), y + R + 1), slice(max(0, x - R), x + R + 1))
    b = B[sl]; out = []
    for n, v in V:
        w = v[sl]; rem = (b & ~binary_dilation(w)).sum(); add = (w & ~binary_dilation(b)).sum()
        out.append(f"{-int(rem):>6}/{'+' + str(int(add)):<6}")
    print(f"{k:6}{c:7}{int(b.sum()):4} " + " ".join(out))
