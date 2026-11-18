# K1482: "speck px" per site = stroke pixels a KxK opening removes (stroke features thinner than K device px:
# dots, ticks, taper tips, dash fragments). The border stroke on Levi's link is ~6-7 px; a real stroke survives.
#   python specks.py <sites.json> <frame.png> [K=2] [R=28] [THR=24]  -> prints "site x y speck2 speck3" TSV
import json, sys
import numpy as np
from PIL import Image

sites, frame = sys.argv[1], sys.argv[2]
R = int(sys.argv[3]) if len(sys.argv) > 3 else 28
THR = int(sys.argv[4]) if len(sys.argv) > 4 else 24
L = np.asarray(Image.open(frame).convert("L")).astype(np.int16)
M = L <= THR  # the stroke (the border look's stroke is ~20 here; the vellum page is >= 26 inside the knot)

def opening(m, k):
    H, W = m.shape
    er = np.ones((H - k + 1, W - k + 1), bool)
    for dy in range(k):
        for dx in range(k):
            er &= m[dy:H - k + 1 + dy, dx:W - k + 1 + dx]
    di = np.zeros_like(m)
    for dy in range(k):
        for dx in range(k):
            di[dy:H - k + 1 + dy, dx:W - k + 1 + dx] |= er
    return di

O2, O3 = opening(M, 2), opening(M, 3)
S2, S3 = M & ~O2, M & ~O3
print("site\tx\ty\tspeck2\tspeck3")
tot2 = tot3 = 0
for s in json.load(open(sites))["sites"]:
    x, y = round(s["x"]), round(s["y"])
    a2 = int(S2[y - R:y + R, x - R:x + R].sum()); a3 = int(S3[y - R:y + R, x - R:x + R].sum())
    tot2 += a2; tot3 += a3
    print(f"{s['site']}\t{x}\t{y}\t{a2}\t{a3}")
print(f"# total speck2 {tot2} speck3 {tot3}; whole frame speck2 {int(S2.sum())} speck3 {int(S3.sum())}", file=sys.stderr)
