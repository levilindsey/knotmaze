# K1482 s14: per-pixel terms of the border composite around a pixel, from patch_d1.json's frames (one debug run on
# master's source that computes master's and c1's lkGap terms side by side) and the plain master / candidate frames.
#   python terms14.py <d1 dir> <master gf.png> <cand gf.png> <x> <y> [R=4]
# d1/gf.png (border shot):  R = label chain + 1 (the label site's, or lkFringe's lowest covering piece), G = slot over
#   chain cS + 1 (0 = none), B = flags: 1 label site (else fringe), 2 piece label, 4 jm (a member of cS in the list),
#   8 a member of any chain in the list, 16 the N cut ran, 32 inside a window (wm > -pxw), 64 lkGap ran, 128 marker
# d1/gf_fill.png (fill shot): R = 16 q(loop g, master) + q(loop g, c1), G = 16 q(N cut, master) + q(N cut, c1),
#   B = 255 * the uncut ink (before the gap), q(v) = round(15 v)
# A pixel where the border and fill shots agree is not a look pixel (background).
# Per pixel: m = master ink sum (RGB sum, ink <= 73), c = candidate's, then lab/cS/flags and the four cuts; the
# composite's stroke alpha at a labelled pixel is thr(ink) * (1 - max(loop, N, marker)), thr(i) = clamp((i - .36) 3.5).
import sys
import numpy as np
from PIL import Image
d, fm, fc, x0, y0 = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
R = int(sys.argv[6]) if len(sys.argv) > 6 and sys.argv[6] != "--diff" else 4
DIFF = "--diff" in sys.argv  # only the pixels whose ink status differs between master and the candidate
L = lambda f: np.asarray(Image.open(f).convert("RGB")).astype(int)
B, F, M, C = L(d + "/gf.png"), L(d + "/gf_fill.png"), L(fm), L(fc)
thr = lambda i: min(max((i - 0.36) * 3.5, 0.0), 1.0)
print(f"around ({x0},{y0}), R={R}; cells: m/c ink sums | lab cS flags | loop M/C  N M/C  ink thr")
for y in range(y0 - R, y0 + R + 1):
    for x in range(x0 - R, x0 + R + 1):
        b, f = B[y, x], F[y, x]
        ms, cs = M[y, x].sum(), C[y, x].sum()
        mk = ("#" if ms <= 73 else ".") + ("#" if cs <= 73 else ".")
        if DIFF and mk[0] == mk[1]: continue
        if (b == f).all():
            print(f"({x},{y}) {mk} m{ms:3d} c{cs:3d} | bg"); continue
        fl = int(b[2]); lab, cs_ = int(b[0]) - 1, int(b[1]) - 1
        gl0, gl1, gn0, gn1 = (f[0] // 16) / 15, (f[0] % 16) / 15, (f[1] // 16) / 15, (f[1] % 16) / 15
        ink = f[2] / 255
        site = "LAB" if fl & 1 else "frg"
        fs = "".join(n for bit, n in ((2, "P"), (4, "J"), (8, "A"), (16, "N"), (32, "W"), (64, "G"), (128, "K")) if fl & bit)
        aM = thr(ink) * (1 - max(gl0, gn0)); aC = thr(ink) * (1 - max(gl1, gn1))
        print(f"({x},{y}) {mk} m{ms:3d} c{cs:3d} | {site} lab{lab:3d} cS{cs_:3d} {fs:7s} | loop {gl0:.2f}/{gl1:.2f} N {gn0:.2f}/{gn1:.2f} ink {ink:.2f} -> aM {aM:.2f} aC {aC:.2f}")
