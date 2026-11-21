# K1548 (27H): where do two same-state shots differ? bbox + count over a level tol, and the largest
# connected clusters (so a dotted line, if present, shows as clusters along an edge).
#   python .claude/probes/K1548/imgdiff.py <pngA> <pngB> [tol]
import sys
import numpy as np
from PIL import Image

a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.int32)
b = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(np.int32)
tol = int(sys.argv[3]) if len(sys.argv) > 3 else 8
d = np.abs(a - b).max(axis=2)
m = d > tol
ys, xs = np.nonzero(m)
print(f"diff>{tol}: {int(m.sum())} px")
if len(xs):
    print(f"bbox x {xs.min()}..{xs.max()} y {ys.min()}..{ys.max()}")
    # crude clustering: 32px grid cells with counts
    cells = {}
    for x, y in zip(xs[::7], ys[::7]):
        cells[(x // 32, y // 32)] = cells.get((x // 32, y // 32), 0) + 1
    top = sorted(cells.items(), key=lambda kv: -kv[1])[:10]
    print("top 32px cells (sampled):", [(f"{cx*32},{cy*32}", n) for (cx, cy), n in top])
