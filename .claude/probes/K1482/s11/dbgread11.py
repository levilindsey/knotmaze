import json, sys
import numpy as np
from PIL import Image
r = sys.argv[1]
E = np.asarray(Image.open(r + "/" + sys.argv[2] + "/gf.png").convert("RGB")).astype(int)
F = np.asarray(Image.open(r + "/" + sys.argv[2] + "/gf_fill.png").convert("RGB")).astype(int)
ds = json.load(open(r + "/ds_base_b3.json"))
rows = []
for k, v in ds.items():
    if v["gain"] + v["loss"] < 10: continue
    vals = []; noarm = 0
    for x, y in v["px"]:
        e = E[y, x]; f = F[y, x]
        if e[0] >= 255 and e[1] == 0: noarm += 1; continue
        if e[2] >= 255 and e[0] >= 255: continue
        vals.append((e[0] / 20, e[1] / 20, e[2] / 20, f[0] / 255, f[1] / 255, f[2]))
    if not vals: rows.append((k, len(v["px"]), noarm)); continue
    a = np.array(vals); m = np.median(a, 0); lo = a.min(0); hi = a.max(0)
    rows.append((k, len(v["px"]), (m, lo, hi, len(vals))))
for k, n, t in sorted(rows, key=lambda r: (r[2][0][0] if isinstance(r[2], tuple) else 99)):
    if not isinstance(t, tuple): print("%-16s n%3d no hit (member, no arm: %d)" % (k, n, t)); continue
    m, lo, hi, nv = t
    print("%-16s n%3d hit%3d d/h %5.2f [%5.2f..%5.2f] armL/h %5.2f Lc/h %5.2f cj %.2f sin %.2f lab %d" % (k, n, nv, m[0], lo[0], hi[0], m[1], m[2], m[3], m[4], m[5]))


