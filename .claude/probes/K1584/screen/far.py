# K1584: where two captures differ FAR from every crossing. Each changed border pixel (ink change > 0.5) gets its
# distance to the nearest recorded under-border side point or crossing centre; a gap cut lies close to one. Prints
# the distance histogram of removed and added pixels, and writes the far clusters (changed pixels beyond FAR px,
# merged within 12 px) as places.
#   python far.py <s5checkDir> <capA template> <capB template> <out.json> [FAR=20]
import sys, json, glob, os
import numpy as np
from PIL import Image
sp, ta, tb, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
FAR = float(sys.argv[5]) if len(sys.argv) > 5 else 20.0
EDG = [0, 6, 12, 20, 30, 45, 1e9]
def ink(p):
    a = np.asarray(Image.open(p).convert('L')).astype(np.float32)
    return np.clip((23.5 - a) / 3.5, 0, 1)
def near(px, P):
    o = np.empty(len(px), np.float32)
    for k in range(0, len(px), 4000):
        q = px[k:k + 4000]
        o[k:k + 4000] = np.sqrt(((q[:, None, :] - P[None, :, :]) ** 2).sum(2)).min(1)
    return o
res = []; HR = np.zeros(6, int); HA = np.zeros(6, int)
for f in sorted(glob.glob(os.path.join(sp, '[AD]_?.json'))):
    m = os.path.basename(f)[:-5]
    A = ink(ta.replace('{m}', m) + r'\gf_b2.png'); B = ink(tb.replace('{m}', m) + r'\gf_b2.png')
    d = B - A; S = json.load(open(f))['sides']
    P = np.array([s['at'] for s in S if s.get('at')] + [s['dev'] for s in S if s.get('dev')], np.float32)[:, :2]
    row = [m]
    for sign, H in ((-1, HR), (1, HA)):
        ys, xs = np.nonzero(d * sign > 0.5)
        px = np.stack([xs, ys], 1).astype(np.float32)
        dist = near(px, P) if len(px) else np.zeros(0, np.float32)
        h = np.histogram(dist, EDG)[0]; H += h; row.append('/'.join(str(v) for v in h))
        far = px[dist > FAR]; cells = {}
        for x, y in far: cells.setdefault((int(x) // 12, int(y) // 12), []).append((x, y))
        seen = set()
        for c in list(cells):
            if c in seen: continue
            st = [c]; seen.add(c); pts = []
            while st:
                q = st.pop(); pts += cells[q]
                for ax in (-1, 0, 1):
                    for ay in (-1, 0, 1):
                        r = (q[0] + ax, q[1] + ay)
                        if r in cells and r not in seen: seen.add(r); st.append(r)
            Q = np.array(pts, np.float32); cx, cy = float(Q[:, 0].mean()), float(Q[:, 1].mean())
            res.append({'m': m, 'x': round(cx, 1), 'y': round(cy, 1), 'px': len(pts), 'kind': 'removed' if sign < 0 else 'added',
                        'near': round(float(np.sqrt(((P - [cx, cy]) ** 2).sum(1)).min()), 1)})
    print(*row)
print('bins', EDG[:-1]); print('removed', HR.tolist(), 'added', HA.tolist())
for k in ('removed', 'added'):
    L = [r for r in res if r['kind'] == k]
    print(k, 'far places', len(L), 'px', sum(r['px'] for r in L), '>=8px', sum(1 for r in L if r['px'] >= 8), '>=30px', sum(1 for r in L if r['px'] >= 30))
json.dump(res, open(out, 'w'))
