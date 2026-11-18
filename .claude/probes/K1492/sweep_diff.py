# K1492: which of cap.mjs's sites change between two gf.png frames of one physics hash, and is each change at an
# under thread's outline end (near a crossing's gap)? Writes diff.png (|a-b| x 16) for tiles.py's third column.
#   python sweep_diff.py <sites.json> <a.png> <b.png> <diff.png> [R=18] [TOL=2]
import json, sys
import numpy as np
from PIL import Image
sp, ap, bp, dp = sys.argv[1:5]
R = int(sys.argv[5]) if len(sys.argv) > 5 else 18
TOL = int(sys.argv[6]) if len(sys.argv) > 6 else 2
S = json.load(open(sp))["sites"]
a = np.asarray(Image.open(ap).convert("RGB")).astype(int); b = np.asarray(Image.open(bp).convert("RGB")).astype(int)
df = np.abs(a - b).max(2)
Image.fromarray(np.repeat(np.minimum(df * 16, 255)[:, :, None], 3, 2).astype(np.uint8)).save(dp)
print(f"frame: {int((df > 0).sum())} px differ, {int((df > TOL).sum())} by > {TOL}, max {int(df.max())}")
rows = []
for s in S:
    x, y = int(round(s["x"])), int(round(s["y"]))
    w = df[max(0, y - R):y + R, max(0, x - R):x + R]
    n = int((w > TOL).sum())
    if n: rows.append((n, int(w.max()), s["site"], s.get("kind", "?")))
rows.sort(reverse=True)
kinds = {}
for s in S: kinds[s.get("kind", "?")] = kinds.get(s.get("kind", "?"), 0) + 1
print(f"sites {len(S)} {kinds}; changed (> {TOL} levels within {R} px): {len(rows)}")
ck = {}
for r in rows: ck[r[3]] = ck.get(r[3], 0) + 1
print("changed by kind", ck)
for n, m, s, k in rows: print(f"{s:8s} {k:10s} px {n:5d} max {m:3d}")
