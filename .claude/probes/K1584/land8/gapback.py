# K1584 land8: does the merge put ink back into a gap stage 8 opened? Per maze, "opened" = pixels s8a draws lighter
# than today (m0) by more than thr levels (luminance), "inked" = opened pixels land8 draws darker than s8a by more than
# thr. Each inked pixel is classed by master: J = land8 equals master's j5 there (master's junction rule inks it in
# today's renderer too), else X. Clusters (8 px blocks, as cmp4.py) list their size, darkest step and nearest junction.
#   python gapback.py <out.json> <A tmpl> <L tmpl> <M tmpl> <J tmpl> [thr=2]
import sys, json
import numpy as np
from PIL import Image
out, tA, tL, tM, tJ = sys.argv[1:6]
thr = float(sys.argv[6]) if len(sys.argv) > 6 else 2
MZ = ['A_%s' % c for c in '3456789abcd'] + ['D_%s' % c for c in '123456789a']
W = np.array([0.299, 0.587, 0.114], np.float32)
lum = lambda t, m: np.asarray(Image.open(t.format(m=m) + r'\gf_b2.png').convert('RGB')).astype(np.float32) @ W
res = {'thr': thr, 'mazes': {}, 'places': []}
for m in MZ:
    A, L, M, J = lum(tA, m), lum(tL, m), lum(tM, m), lum(tJ, m)
    jun = [(s['site'], s['x'], s['y']) for s in json.load(open(tL.format(m=m) + r'\sites_gf.json'))['sites'] if s['kind'] == 'junction']
    opened = A - M > thr
    inked = opened & (A - L > thr)
    isJ = inked & (np.abs(L - J) <= thr)
    res['mazes'][m] = {'opened': int(opened.sum()), 'inked': int(inked.sum()), 'inkedJ': int(isJ.sum()),
                       'inkedX': int((inked & ~isJ).sum()), 'lighter': int((opened & (L - A > thr)).sum())}
    ys, xs = np.nonzero(inked)
    seen = set()
    for y, x in zip(ys, xs):
        if (y, x) in seen: continue
        st = [(y, x)]; seen.add((y, x)); pts = []
        while st:
            cy, cx = st.pop(); pts.append((cy, cx))
            for dy in range(-8, 9):
                for dx in range(-8, 9):
                    q = (cy + dy, cx + dx)
                    if 0 <= q[0] < A.shape[0] and 0 <= q[1] < A.shape[1] and q not in seen and inked[q]:
                        seen.add(q); st.append(q)
        py = np.array([p[0] for p in pts]); px = np.array([p[1] for p in pts])
        dj = min((float(np.min(np.hypot(px - j[1], py - j[2]))), j[0]) for j in jun)
        res['places'].append({'m': m, 'box': [int(px.min()), int(py.min()), int(px.max()) + 1, int(py.max()) + 1], 'px': len(pts),
                              'J': int(isJ[py, px].sum()), 'X': int(len(pts) - isJ[py, px].sum()),
                              'maxStep': round(float((A - L)[py, px].max()), 1), 'jun': dj[1], 'dJun': round(dj[0], 1)})
json.dump(res, open(out, 'w'), indent=1)
T = {k: sum(r[k] for r in res['mazes'].values()) for k in ['opened', 'inked', 'inkedJ', 'inkedX', 'lighter']}
print('thr', thr, 'totals', T)
for m, r in res['mazes'].items(): print('  %-4s opened %6d inked %4d (J %4d, X %3d) lighter %4d' % (m, r['opened'], r['inked'], r['inkedJ'], r['inkedX'], r['lighter']))
P = sorted(res['places'], key=lambda p: -p['px'])
print('places', len(P), '; px histogram', np.histogram([p['px'] for p in P], [1, 2, 4, 8, 16, 32, 64, 1e9])[0].tolist(),
      '; max dJun', max((p['dJun'] for p in P), default=0))
for p in P[:15]: print('  ', p)
