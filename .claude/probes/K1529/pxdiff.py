# K1529 (27B): pixel comparison of capture PNGs.
#   python .claude/probes/K1529/pxdiff.py <png...>   (first file is the reference)
# Prints md5 groups (distinct pictures) and, per file vs the reference: differing px
# (any channel), px > 8, max |d|, mean |d| over differing px, and the bbox (device px).
import hashlib, sys
import numpy as np
from PIL import Image

paths = sys.argv[1:]
imgs = []
for p in paths:
    b = open(p, "rb").read()
    im = np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)
    imgs.append((p, hashlib.md5(b).hexdigest()[:10], im))
    print(f"{p}  md5={imgs[-1][1]} shape={im.shape}")
groups = {}
for p, h, _ in imgs:
    groups.setdefault(h, []).append(p)
print(f"distinct pictures: {len(groups)}")
for h, ps in groups.items():
    print(f"  {h}: {len(ps)} load(s)")
ref = imgs[0][2]
for p, h, im in imgs[1:]:
    if im.shape != ref.shape:
        print(f"{p}: SHAPE DIFFERS {im.shape} vs {ref.shape}")
        continue
    d = np.abs(im - ref).max(axis=2)
    n = int((d > 0).sum())
    if n == 0:
        print(f"{p}: 0 px")
        continue
    ys, xs = np.nonzero(d > 0)
    print(f"{p}: {n} px differ, {int((d > 8).sum())} > 8, max {int(d.max())}, "
          f"mean {float(d[d > 0].mean()):.2f}, "
          f"bbox x {int(xs.min())}..{int(xs.max())} y {int(ys.min())}..{int(ys.max())}, "
          f"levels 1:{int((d == 1).sum())} 2-3:{int(((d >= 2) & (d <= 3)).sum())} 4-8:{int(((d >= 4) & (d <= 8)).sum())}")
