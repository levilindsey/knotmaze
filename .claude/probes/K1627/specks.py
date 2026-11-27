# K1627 s3: paper specks in a capture: islands of paper-coloured pixels (every channel > --lo, spread < --spread) that
# a square ring of non-paper pixels at radius 2..--rmax encloses (so an island fits in a (2 rmax - 1) px box), merged
# within --join px. Lists each (centre, paper px inside) and the count.
#   python specks.py <gf_b2.png> [--rmax 5] [--lo 195] [--spread 30] [--join 6] [--json out.json --maze L]
import sys, json
import numpy as np
from PIL import Image
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
A = np.asarray(Image.open(a[0]).convert('RGB')).astype(int)
rmax = int(opt('--rmax', 5)); lo = int(opt('--lo', 195)); sp = int(opt('--spread', 30)); join = int(opt('--join', 6))
paper = (A.min(2) > lo) & (A.max(2) - A.min(2) < sp)
H, W = paper.shape
P = np.pad(paper, rmax + 1, constant_values=True)
def sh(dy, dx): return P[rmax + 1 + dy: rmax + 1 + dy + H, rmax + 1 + dx: rmax + 1 + dx + W]
hit = np.zeros_like(paper)
for r in range(2, rmax + 1):
    ring = np.zeros_like(paper)
    for t in range(-r, r + 1):
        ring |= sh(-r, t) | sh(r, t) | sh(t, -r) | sh(t, r)
    hit |= paper & ~ring
ys, xs = np.nonzero(hit)
pts = sorted(zip(xs.tolist(), ys.tolist()))
groups = []
for x, y in pts:
    for g in groups:
        if abs(g[0] - x) <= join and abs(g[1] - y) <= join and x <= g[2] + join:
            g[3].append((x, y)); g[2] = max(g[2], x); break
    else:
        groups.append([x, y, x, [(x, y)]])
out = []
for g in groups:
    q = np.array(g[3]); x0, y0 = q.min(0) - 1; x1, y1 = q.max(0) + 1
    out.append({'m': opt('--maze', ''), 'x': int(round(q[:, 0].mean())), 'y': int(round(q[:, 1].mean())),
                'px': int(paper[y0:y1 + 1, x0:x1 + 1].sum())})
for o in out: print(f"  {o['m']} ({o['x']:4d},{o['y']:4d}) px {o['px']}")
print('specks', len(out), 'pixels', sum(o['px'] for o in out))
if '--json' in a: json.dump(out, open(opt('--json', ''), 'w'))
