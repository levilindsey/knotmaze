# K1468 Done 3: pixel diff of two ab.mjs dirs, same file names. Prints per file: differing px, max channel delta,
# and the bounding box of the differences; with a third arg writes a red-on-grey map per differing file there.
#   python diff.py <dirA> <dirB> [mapDir]
import os, sys
import numpy as np
from PIL import Image
a, b = sys.argv[1], sys.argv[2]
mapdir = sys.argv[3] if len(sys.argv) > 3 else None
tot = 0
for n in sorted(os.listdir(a)):
    if not n.endswith(".png") or not os.path.exists(os.path.join(b, n)):
        continue
    x = np.asarray(Image.open(os.path.join(a, n)).convert("RGBA")).astype(int)
    y = np.asarray(Image.open(os.path.join(b, n)).convert("RGBA")).astype(int)
    if x.shape != y.shape:
        print(f"{n}: shape {x.shape} vs {y.shape}"); tot += 1; continue
    d = np.abs(x - y).max(axis=2)
    m = d > 0
    cnt = int(m.sum()); tot += cnt
    if cnt == 0:
        print(f"{n}: 0 px"); continue
    ys, xs = np.nonzero(m)
    hist = {k: int((d == k).sum()) for k in range(1, 4)}
    print(f"{n}: {cnt} px, max delta {int(d.max())}, delta 1/2/3: {hist[1]}/{hist[2]}/{hist[3]}, box x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}")
    if mapdir:
        os.makedirs(mapdir, exist_ok=True)
        g = (x[:, :, :3].mean(axis=2) * 0.4).astype(np.uint8)
        im = np.stack([g, g, g], axis=2)
        im[m] = [255, 0, 0]
        Image.fromarray(im).save(os.path.join(mapdir, "map_" + n))
print(f"TOTAL {tot}")
