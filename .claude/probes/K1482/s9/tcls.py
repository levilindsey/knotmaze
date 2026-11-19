import json, sys
import numpy as np
from PIL import Image
r = sys.argv[1]
X = json.load(open(r + "/xpos9.json"))
T = np.asarray(Image.open(r + "/s8/m/today.png").convert("RGB")).astype(int)
ink = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int).sum(-1) <= 73
G = ink(r + "/s8/m/gf.png"); N = ink(r + "/s8/nogap/gf.png")
def dil(a):
    b = a.copy(); b[1:] |= a[:-1]; b[:-1] |= a[1:]; c = b.copy(); c[:, 1:] |= b[:, :-1]; c[:, :-1] |= b[:, 1:]; return c
GD = dil(G)
bg = np.median(T.reshape(-1, 3), 0)
want = set(int(v) for v in sys.argv[2].split(",")) if len(sys.argv) > 2 else None
R = 20
for c in X:
    if want is not None and c["i"] not in want: continue
    cx, cy = c["x"], c["y"]; box = (slice(cy - R, cy + R), slice(cx - R, cx + R))
    rm = N[box] & ~GD[box]; n = int(rm.sum())
    if n == 0: print(f"x{c['i']} rm 0"); continue
    t = T[box][rm]; s = t.sum(-1); rb = t[:, 0] - t[:, 2]
    stroke = (rb > 0).mean(); dark = ((rb <= 0) & (s < 300)).mean(); blue = ((rb <= 0) & (s >= 300)).mean()
    print(f"x{c['i']} rm {n} stroke {stroke:.2f} dark {dark:.2f} bg {blue:.2f} meanRGB {t.mean(0).round().astype(int).tolist()} jo {c['jo']} ju {c['ju']} site {c['site']}")
