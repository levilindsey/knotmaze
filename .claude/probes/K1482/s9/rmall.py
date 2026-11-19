# K1482 s9: per crossing, the outline pixels gf's gap removes on master (nogap ink with no master ink within 1 px,
# R px around the crossing), as JSON {"<i>": [[x, y], ...]} for jdist.ts.
#   python rmall.py <xpos9.json> <master gf.png> <nogap gf.png> <out.json>   [env R=20 TH=73]
import json, os, sys
import numpy as np
from PIL import Image
xp, gp, np_, out = sys.argv[1:5]
R = int(os.environ.get("R", 20)); TH = int(os.environ.get("TH", 73))
ink = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int).sum(-1) <= TH
G = ink(gp); N = ink(np_)
b = G.copy(); b[1:] |= G[:-1]; b[:-1] |= G[1:]; GD = b.copy(); GD[:, 1:] |= b[:, :-1]; GD[:, :-1] |= b[:, 1:]
res = {}
for c in json.load(open(xp)):
    cx, cy = c["x"], c["y"]
    rm = N[cy - R:cy + R, cx - R:cx + R] & ~GD[cy - R:cy + R, cx - R:cx + R]
    ys, xs = np.nonzero(rm)
    res[str(c["i"])] = [[int(x + cx - R), int(y + cy - R)] for x, y in zip(xs, ys)]
json.dump(res, open(out, "w")); print(sum(len(v) for v in res.values()), "px over", len(res), "crossings")
