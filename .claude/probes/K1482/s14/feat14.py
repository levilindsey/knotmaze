# K1482 s14: candidate features of c1's changed pixels per site, from patch_d2.json's frames.
#   python feat14.py <d2 dir> <master gf.png> <c1 gf.png> <sites_gf.json> <site,site,...>
# d2/gf_fill.png (fill shot, o1): R = sinT of the over chain's member piece in the list, G = its arm weight (arc to the
#   arm's end / (margin + fade), clamped), B = sinT at the over pass's nearest point N
# d2/gf.png (border shot, o2): R = arm weight at N, G = the label's joint group + 1 at its own arc, B = the over
#   chain's joint group + 1 at N
# Per site: the pixels inside the 48x48 box whose ink status differs between master and c1, and the features' range.
import sys, json
import numpy as np
from PIL import Image
d, fm, fc, sj, names = sys.argv[1:6]
L = lambda f: np.asarray(Image.open(f).convert("RGB")).astype(int)
F, B, M, C = L(d + "/gf_fill.png"), L(d + "/gf.png"), L(fm), L(fc)
S = json.load(open(sj))
sites = S["sites"] if isinstance(S, dict) and "sites" in S else S
def at(n):
    for s in sites:
        if s.get("site") == n: return int(round(s["x"])), int(round(s["y"]))
    raise KeyError(n)
mi, ci = M.sum(2) <= 73, C.sum(2) <= 73
print("site    n  sinL(min/med/max)   wL(min/med/max)    sinN(med)  wN(min/med/max)    labG==ovG")
for n in names.split(","):
    x0, y0 = at(n)
    ys, xs = np.nonzero(mi[y0 - 24:y0 + 24, x0 - 24:x0 + 24] != ci[y0 - 24:y0 + 24, x0 - 24:x0 + 24])
    ys, xs = ys + y0 - 24, xs + x0 - 24
    if len(xs) == 0: print(f"{n:6s} 0"); continue
    f, b = F[ys, xs] / 255.0, B[ys, xs]
    q = lambda v: f"{v.min():.2f}/{np.median(v):.2f}/{v.max():.2f}"
    same = np.mean((b[:, 1] == b[:, 2]) & (b[:, 1] > 0))
    print(f"{n:6s} {len(xs):3d}  {q(f[:, 0]):16s}  {q(f[:, 1]):16s}  {np.median(f[:, 2]):.2f}      {q(b[:, 0] / 255.0):16s}  {same:.2f}  labG {sorted(set(b[:, 1] - 1))[:4]} ovG {sorted(set(b[:, 2] - 1))[:4]}")
