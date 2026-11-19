# K1482 s10: every site whose gf ink changed between two frames of one physics state (the master frame and a patched
# one): changed ink pixels (sum <= 73 on either side, differing) grouped into 6 px blobs, each named by its nearest
# site (sites_gf.json) within 40 px; prints per site the pixels gained / lost.
#   python diffsites.py <a.png> <b.png> <sites_gf.json> [out.json]
import json, sys
import numpy as np
from PIL import Image
a, b, sp = sys.argv[1:4]
A = np.asarray(Image.open(a).convert("RGB")).astype(int); B = np.asarray(Image.open(b).convert("RGB")).astype(int)
anyd = np.abs(A - B).sum(-1) > 0
ia, ib = A.sum(-1) <= 73, B.sum(-1) <= 73
ch = ia != ib
S = json.load(open(sp))["sites"]
P = np.array([[s["x"], s["y"]] for s in S])
print("pixels differing", int(anyd.sum()), "ink changed", int(ch.sum()), "(gained", int((ib & ~ia).sum()), "lost", int((ia & ~ib).sum()), ")")
ys, xs = np.nonzero(ch)
res = {}
for x, y in zip(xs, ys):
    d = np.hypot(P[:, 0] - x, P[:, 1] - y); k = int(np.argmin(d))
    nm = S[k]["site"] if d[k] < 40 else "none@%d,%d" % (x // 40 * 40, y // 40 * 40)
    r = res.setdefault(nm, {"gain": 0, "loss": 0, "px": []})
    if ib[y, x]: r["gain"] += 1
    else: r["loss"] += 1
    r["px"].append([int(x), int(y)])
for nm, r in sorted(res.items(), key=lambda kv: -(kv[1]["gain"] + kv[1]["loss"])):
    p = np.array(r["px"]); print("%-14s gain %4d loss %4d  centre %d,%d" % (nm, r["gain"], r["loss"], p[:, 0].mean(), p[:, 1].mean()))
if len(sys.argv) > 4: json.dump(res, open(sys.argv[4], "w"))
