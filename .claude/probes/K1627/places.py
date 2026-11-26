# K1627 s1: changed places between two captures of one maze (any file name): pixels whose max channel step > thr,
# 8-connected and merged within --join px, one line each (centre, box, pixels, max step), plus a JSON for sheets.
#   python places.py <a.png> <b.png> [--thr 4] [--join 12] [--json out.json] [--maze L]
import sys, json
import numpy as np
from PIL import Image
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
A = np.asarray(Image.open(a[0]).convert('RGB')).astype(int); B = np.asarray(Image.open(a[1]).convert('RGB')).astype(int)
thr = int(opt('--thr', 4)); join = int(opt('--join', 12)); mz = opt('--maze', '')
d = np.abs(A - B).max(2); m = d > thr
ys0, xs0 = np.nonzero(m); par = list(range(len(ys0)))
def f(i):
    while par[i] != i: par[i] = par[par[i]]; i = par[i]
    return i
from collections import defaultdict
cell = defaultdict(list); J = max(join, 2)
for i, (y, x) in enumerate(zip(ys0, xs0)): cell[(y // J, x // J)].append(i)
for (cy, cx), L in cell.items():
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            for i in L:
                for j in cell.get((cy + dy, cx + dx), ()):
                    if j > i and abs(int(ys0[i]) - int(ys0[j])) <= J and abs(int(xs0[i]) - int(xs0[j])) <= J:
                        a_, b_ = f(i), f(j)
                        if a_ != b_: par[a_] = b_
grp = defaultdict(list)
for i in range(len(ys0)): grp[f(i)].append(i)
out = []
for g in grp.values():
    ys = ys0[g]; xs = xs0[g]
    out.append({'m': mz, 'x': int(xs.mean()), 'y': int(ys.mean()), 'box': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                'px': len(g), 'max': int(d[ys, xs].max())})
out.sort(key=lambda o: -o['px'])
for i, o in enumerate(out, 1):
    o['n'] = i
    print('%3d %s (%4d,%4d) box %s px %4d max %3d' % (i, mz, o['x'], o['y'], o['box'], o['px'], o['max']))
print('places', len(out), 'pixels', int(m.sum()))
if '--json' in a: json.dump(out, open(opt('--json', ''), 'w'), indent=1)
