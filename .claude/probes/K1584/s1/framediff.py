# K1584 s1: where two same-view captures differ. Clusters changed pixels (|dLum| > thr) into boxes and names each
# box by the nearest crossing (scene_gf.json) and the nearest junction/tail site (sites_gf.json).
#   python framediff.py <beforeDir> <afterDir> [out.json] [thr=6]
import sys, json, math
import numpy as np
from PIL import Image

b, a = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
thr = float(sys.argv[4]) if len(sys.argv) > 4 else 6
vb = open(b + '/gf_b2view.txt').readline().strip(); va = open(a + '/gf_b2view.txt').readline().strip()
same = all(abs(float(p) - float(q)) < 1e-6 for p, q in zip(vb.split(','), va.split(',')))
def lum(d):
    x = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
    return (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
A, B = lum(a), lum(b)
D = np.abs(A - B) > thr
n = int(D.sum())
# clusters: changed pixels binned to 16 px cells, cells joined with their 8 neighbours
C = 16
ys, xs = np.nonzero(D)
cells = {}
for y, x in zip(ys // C, xs // C): cells[(y, x)] = cells.get((y, x), 0) + 1
par = {c: c for c in cells}
def find(c):
    while par[c] != c: par[c] = par[par[c]]; c = par[c]
    return c
for (y, x) in cells:
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            q = (y + dy, x + dx)
            if q in cells: par[find(q)] = find((y, x))
grp = {}
for c in cells: grp.setdefault(find(c), []).append(c)
sl = []
for g in grp.values():
    y0 = min(c[0] for c in g) * C; y1 = (max(c[0] for c in g) + 1) * C; x0 = min(c[1] for c in g) * C; x1 = (max(c[1] for c in g) + 1) * C
    sl.append((slice(y0, min(y1, D.shape[0])), slice(x0, min(x1, D.shape[1]))))
scene = json.load(open(b + '/scene_gf.json')); sites = json.load(open(b + '/sites_gf.json'))
T = sites['toDevA']
def at(c, s):
    pts = scene['chains'][c]['pts']; m = len(pts) // 2; closed = scene['chains'][c]['closed']
    acc = 0; segs = m if closed else m - 1
    for i in range(segs):
        j = (i + 1) % m
        dx = pts[2 * j] - pts[2 * i]; dy = pts[2 * j + 1] - pts[2 * i + 1]; l = math.hypot(dx, dy)
        if acc + l >= s or i == segs - 1:
            t = (s - acc) / l if l > 0 else 0
            return pts[2 * i] + dx * t, pts[2 * i + 1] + dy * t
        acc += l
X = []
for i, c in enumerate(scene['crossings']):
    u = c['b'] if c['over'] == 'a' else c['a']
    wx, wy = at(u['chain'], u['s'])
    X.append((T[0] * wx + T[2] * wy + T[4], T[1] * wx + T[3] * wy + T[5]))
S = [(s['site'], s['x'], s['y']) for s in sites['sites']]
boxes = []
for i, s in enumerate(sl):
    m = D[s]
    px = int(m.sum())
    if px == 0: continue
    cy = (s[0].start + s[0].stop) / 2; cx = (s[1].start + s[1].stop) / 2
    dx = [(math.hypot(x - cx, y - cy), j) for j, (x, y) in enumerate(X)]; dX, jX = min(dx) if dx else (1e9, -1)
    ds = [(math.hypot(x - cx, y - cy), nm) for nm, x, y in S]; dS, nS = min(ds) if ds else (1e9, '')
    dl = float((A[s] - B[s])[m].mean())
    boxes.append({'x': int(cx), 'y': int(cy), 'w': int(s[1].stop - s[1].start), 'h': int(s[0].stop - s[0].start), 'px': px, 'dLum': round(dl, 1), 'cross': jX, 'dCross': round(dX, 1), 'site': nS, 'dSite': round(dS, 1)})
boxes.sort(key=lambda q: -q['px'])
nearX = sum(1 for q in boxes if q['dCross'] <= 45)
print(f"{a}: view same {same}, changed px {n}, boxes {len(boxes)}, within 45 px of a crossing {nearX}, others {len(boxes) - nearX}; brighter {sum(1 for q in boxes if q['dLum'] > 0)} darker {sum(1 for q in boxes if q['dLum'] < 0)}")
for q in [q for q in boxes if q['dCross'] > 45][:12]: print('  far', q)
if out: json.dump({'same': same, 'changed': n, 'boxes': boxes}, open(out, 'w'))
