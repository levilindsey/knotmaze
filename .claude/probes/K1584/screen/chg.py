# K1584: places where two captures differ, split by whether a side's on-screen verdict changed there.
#   python chg.py <s5checkDir> <capA template> <capB template> <ia> <ib> <out.json>
# ia / ib = the captures' indexes in each maze's screen.py JSON (its "scr" lists). A place is a cluster of changed
# border pixels (ink change > 0.5) merged within 12 px. "side" = a side whose verdict differs between ia and ib lies
# within 26 px (one thread width); "other" = none does (a gap that was there got longer, or a border moved).
import sys, json, glob, os
import numpy as np
from PIL import Image
sp, ta, tb, ia, ib, out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
def ink(p):
    a = np.asarray(Image.open(p).convert('L')).astype(np.float32)
    return np.clip((23.5 - a) / 3.5, 0, 1)
res = []; tot = {'side': 0, 'other': 0}
for f in sorted(glob.glob(os.path.join(sp, '[AD]_?.json'))):
    m = os.path.basename(f)[:-5]
    A = ink(ta.replace('{m}', m) + r'\gf_b2.png'); B = ink(tb.replace('{m}', m) + r'\gf_b2.png')
    d = B - A; ys, xs = np.nonzero(np.abs(d) > 0.5)
    S = json.load(open(f))['sides']
    ch = np.array([[s['at'][0], s['at'][1]] for s in S if s.get('at') and s['scr'][ia]['v'] != s['scr'][ib]['v']] or [[-1e9, -1e9]])
    al = [(s['at'][0], s['at'][1], s['i']) for s in S if s.get('at')]
    # cluster: greedy over a 12 px grid, then merge neighbouring cells by flood fill
    cells = {}
    for x, y in zip(xs, ys): cells.setdefault((x // 12, y // 12), []).append((x, y))
    seen = set(); nm = {'side': 0, 'other': 0}
    for c in list(cells):
        if c in seen: continue
        st = [c]; seen.add(c); pts = []
        while st:
            q = st.pop(); pts += cells[q]
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    r = (q[0] + dx, q[1] + dy)
                    if r in cells and r not in seen: seen.add(r); st.append(r)
        P = np.array(pts, np.float32); cx, cy = P[:, 0].mean(), P[:, 1].mean()
        add = float((d[P[:, 1].astype(int), P[:, 0].astype(int)] > 0).sum())
        near = float(np.hypot(ch[:, 0] - cx, ch[:, 1] - cy).min())
        k = 'side' if near <= 26 else 'other'
        xi = min(al, key=lambda t: (t[0] - cx) ** 2 + (t[1] - cy) ** 2)[2] if al else -1
        res.append({'m': m, 'x': round(float(cx), 1), 'y': round(float(cy), 1), 'px': len(pts), 'added': int(add), 'kind': k, 'near': round(near, 1), 'xi': xi})
        nm[k] += 1; tot[k] += 1
    print(m, nm)
print('total', tot, 'px other', sum(r['px'] for r in res if r['kind'] == 'other'), 'px side', sum(r['px'] for r in res if r['kind'] == 'side'),
      'added px', sum(r['added'] for r in res))
json.dump(res, open(out, 'w'))
