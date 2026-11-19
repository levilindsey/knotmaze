# K1482 s16: per-pixel terms of the border composite around a pixel, from patch_dbg16.json's frames (one debug run on
# the tip's source: the flagged and unflagged cuts side by side) and plain frames to compare (ink sums).
#   python terms16.py <dbg dir> <x> <y> [R=3] [frame.png ...]
# dbg/gf.png (border shot):  R = label chain + 1 (the label site's, or lkFringe's lowest covering piece), G = slot over
#   chain cS + 1 (0 = none), B = flags: 1 label site (else fringe), 2 piece label, 4 jf (the flag holds on this pixel's
#   side), 8 jb != 0 (the slot carries a flag), 16 the N cut ran, 32 inside a window, 64 lkGap ran, 128 marker
# dbg/gf_fill.png (fill shot): R = 16 q(loop g, flagged) + q(loop g, unflagged), G = 16 q(N cut, flagged) + q(N, unflagged),
#   B = 4 round(63 uncut ink) + jb, q(v) = round(15 v)
# The border stroke alpha at a labelled pixel is thr(ink) * (1 - max(loop, N, marker)), thr(i) = clamp((i - .36) 3.5);
# a fringe pixel's is thr(min(ink_cut / m, 1)) * m with m its nearest labelled neighbour's (1 - lkg).
import sys
import numpy as np
from PIL import Image
d, x0, y0 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
R = int(sys.argv[4]) if len(sys.argv) > 4 else 3
frames = sys.argv[5:]
L = lambda f: np.asarray(Image.open(f).convert("RGB")).astype(int)
B, F = L(d + "/gf.png"), L(d + "/gf_fill.png")
FR = [L(f) for f in frames]
thr = lambda i: min(max((i - 0.36) * 3.5, 0.0), 1.0)
print(f"around ({x0},{y0}), R={R}; frames: {' '.join(frames)}")
for y in range(y0 - R, y0 + R + 1):
    for x in range(x0 - R, x0 + R + 1):
        b, f = B[y, x], F[y, x]
        sums = " ".join(f"{F_[y, x].sum():3d}{'#' if F_[y, x].sum() <= 73 else '.'}" for F_ in FR)
        if (b == f).all() or (b.sum() == 0 and f.sum() == 0):
            print(f"({x},{y}) {sums} | bg"); continue
        fl = int(b[2]); lab, cs_ = int(b[0]) - 1, int(b[1]) - 1
        gl, gl0, gn, gn0 = (f[0] // 16) / 15, (f[0] % 16) / 15, (f[1] // 16) / 15, (f[1] % 16) / 15
        ink = (int(f[2]) // 4) / 63; jb = int(f[2]) % 4
        site = "LAB" if fl & 1 else "frg"
        fs = "".join(n for bit, n in ((2, "P"), (4, "J"), (8, "B"), (16, "N"), (32, "W"), (64, "G"), (128, "K")) if fl & bit)
        a = thr(ink) * (1 - max(gl, gn)); a0 = thr(ink) * (1 - max(gl0, gn0))
        print(f"({x},{y}) {sums} | {site} lab{lab:3d} cS{cs_:3d} jb{jb} {fs:8s} | loop {gl:.2f}/{gl0:.2f} N {gn:.2f}/{gn0:.2f} ink {ink:.2f} -> a {a:.2f} (unflagged {a0:.2f})")
