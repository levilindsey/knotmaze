from PIL import Image
import sys
from collections import Counter
for fam in ["def", "muse"]:
    a = Image.open(f".claude/probes/K1040/s4c/out/ab_master2/{fam}_a.png").convert("RGB")
    b = Image.open(f".claude/probes/K1040/s4c/out/ab_master2/{fam}_b.png").convert("RGB")
    assert a.size == b.size, (a.size, b.size)
    pa, pb = a.load(), b.load()
    w, h = a.size
    diff = 0
    maxd = 0
    cells = Counter()
    for y in range(h):
        for x in range(w):
            d = max(abs(pa[x, y][0] - pb[x, y][0]), abs(pa[x, y][1] - pb[x, y][1]), abs(pa[x, y][2] - pb[x, y][2]))
            if d:
                diff += 1
                maxd = max(maxd, d)
                cells[(x // 100, y // 100)] += 1
    print(f"{fam}: {w}x{h} diff px {diff} max {maxd} top cells {cells.most_common(6)}")
