# K1530: pixel diff of two same-size PNGs: count, bbox, coarse grid, max delta.
#   python diff.py a.png b.png
import sys
from PIL import Image
import numpy as np
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.int16)
b = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(np.int16)
d = np.abs(a - b).max(axis=2)
mask = d > 0
n = int(mask.sum())
print(f"size {a.shape[1]}x{a.shape[0]} differ {n} maxdelta {int(d.max()) if n else 0}")
if n:
    ys, xs = np.nonzero(mask)
    print(f"bbox x {xs.min()}..{xs.max()} y {ys.min()}..{ys.max()}")
    H, W = mask.shape
    gy, gx = 8, 10
    for r in range(gy):
        row = []
        for c in range(gx):
            cell = mask[r * H // gy:(r + 1) * H // gy, c * W // gx:(c + 1) * W // gx]
            row.append(int(cell.sum()))
        print("grid", row)
    # top clusters: label by 64px blocks
    blocks = {}
    for x, y in zip(xs[::7], ys[::7]):
        blocks[(x // 128, y // 128)] = blocks.get((x // 128, y // 128), 0) + 1
    print("blocks128(sampled/7)", sorted(blocks.items(), key=lambda kv: -kv[1])[:8])
