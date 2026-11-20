# K1530: per-row / per-column diff profile - tearing bands or uniform noise?
import sys
from PIL import Image
import numpy as np
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.int16)
b = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(np.int16)
d = (np.abs(a - b).max(axis=2) > 0)
rows = d.sum(axis=1); cols = d.sum(axis=0)
nzr = np.nonzero(rows)[0]
print(f"rows with diffs: {len(nzr)} of {len(rows)}; row count min/max {rows.min()}/{rows.max()}")
# runs of rows with diffs
runs = []
s = nzr[0]; p = nzr[0]
for y in nzr[1:]:
    if y == p + 1: p = y; continue
    runs.append((s, p)); s = y; p = y
runs.append((s, p))
print("row runs (first 20):", runs[:20], "total runs", len(runs))
print("rows sorted by count desc (top 10):", sorted(enumerate(rows.tolist()), key=lambda t: -t[1])[:10])
print("cols with diffs:", int((cols > 0).sum()), "of", len(cols))
