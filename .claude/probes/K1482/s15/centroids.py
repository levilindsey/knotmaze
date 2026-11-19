# K1482 s15: each mover's changed-ink centroid (64x64 box around the site), as "x:y" for dsheet.py, named by site.
import sys, json
import numpy as np
from PIL import Image
m, c, sj, mv = sys.argv[1:5]
S = {s["site"]: s for s in json.load(open(sj))["sites"]}
M = np.asarray(Image.open(m).convert("RGB")).astype(int).sum(2) <= 73
C = np.asarray(Image.open(c).convert("RGB")).astype(int).sum(2) <= 73
D = M ^ C
out = []
for nm in sys.argv[5].split(","):
    s = S[nm]; cx, cy = int(round(s["x"])), int(round(s["y"]))
    ys, xs = np.nonzero(D[cy-32:cy+32, cx-32:cx+32])
    if len(xs): out.append(f"{cx-32+int(np.median(xs))}:{cy-32+int(np.median(ys))}")
    else: out.append(f"{cx}:{cy}")
print(",".join(out))
