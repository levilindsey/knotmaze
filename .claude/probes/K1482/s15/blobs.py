# K1482 s15: the changed ink between two frames as connected blobs (8-neighbour): size histogram and the biggest,
# each with its nearest site.
#   python blobs.py <master.png> <cand.png> <sites.json> [top 30]
import sys, json, math
import numpy as np
from PIL import Image
def label(D):
    lab = np.zeros(D.shape, int); n = 0; H, W = D.shape
    for y0, x0 in zip(*np.nonzero(D)):
        if lab[y0, x0]: continue
        n += 1; st = [(y0, x0)]; lab[y0, x0] = n
        while st:
            y, x = st.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and D[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; st.append((yy, xx))
    return lab, n
M = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int).sum(2) <= 73
C = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(int).sum(2) <= 73
S = json.load(open(sys.argv[3]))["sites"]
top = int(sys.argv[4]) if len(sys.argv) > 4 else 30
for name, D in (("gain", C & ~M), ("loss", M & ~C)):
    lab, n = label(D)
    sz = np.bincount(lab.ravel(), minlength=n + 1)[1:]
    h = {}
    for s in sz: k = "1" if s == 1 else "2" if s == 2 else "3-5" if s <= 5 else "6-15" if s <= 15 else "16+"; h[k] = h.get(k, 0) + 1
    print(f"{name}: {int(D.sum())} px in {n} blobs", h)
    ys, xs = np.nonzero(lab); ll = lab[ys, xs]
    cs = [(ys[ll == i + 1].mean(), xs[ll == i + 1].mean()) for i in range(n)]
    order = sorted(range(n), key=lambda i: -sz[i])[:top]
    for i in order:
        if sz[i] < 3: break
        y, x = cs[i]
        d, nm = min((math.hypot(s["x"] - x, s["y"] - y), s["site"]) for s in S)
        print(f"  {int(sz[i]):>3} px at ({x:.0f},{y:.0f})  {nm} {d:.0f} px")
