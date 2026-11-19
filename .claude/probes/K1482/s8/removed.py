# K1482 s8: the pixels the gap removes near each site: ink in frame B (nogap) with no ink within 1 px in frame A (master).
#   python removed.py <sites.json> <A.png> <B.png> <site,...> <out.json> [env R=32 TH=73]
import json, os, sys
import numpy as np
from PIL import Image
sj, ap, bp, names, out = sys.argv[1:6]
R = int(os.environ.get("R", 32)); TH = int(os.environ.get("TH", 73))
S = {s["site"]: s for s in json.load(open(sj))["sites"]}
A = np.asarray(Image.open(ap).convert("RGB")).astype(int).sum(-1) <= TH
B = np.asarray(Image.open(bp).convert("RGB")).astype(int).sum(-1) <= TH
D = A.copy(); D[1:] |= A[:-1]; D[:-1] |= A[1:]; E = D.copy(); E[:, 1:] |= D[:, :-1]; E[:, :-1] |= D[:, 1:]
o = {}
for n in names.split(","):
    s = S[n]; cx, cy = round(s["x"]), round(s["y"])
    ys, xs = np.nonzero(B[cy - R:cy + R, cx - R:cx + R] & ~E[cy - R:cy + R, cx - R:cx + R])
    o[n] = {"c": [cx, cy], "px": [[int(x) + cx - R, int(y) + cy - R] for x, y in zip(xs, ys)]}
json.dump(o, open(out, "w")); print({n: len(v["px"]) for n, v in o.items()})
