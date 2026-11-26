# K1584 s10 (copy of s9/chg9.py): s8a -> s10a (env CHG10_B) on all 21 mazes. Every changed pixel (gray step > thr) grouped into 8-connected places, each
# placed at its nearest ball (out/measure.json; loose side = opening >= the line); per ball: pixels changed s8a -> s10a
# within 30 px, and within that window the pixels where s10a / s8a differ from stage 5 (s5d) by > 6 levels.
#   python chg10.py [line_deg=45] [thr=1]   -> s10/out/chg10.txt, s10/out/chg10.json (balls from s9/out/measure.json)
import sys, json, os
import numpy as np
from PIL import Image
def comps(mask):  # 8-connected components of a sparse mask: a list of (ys, xs) arrays
    pts = set(zip(*np.nonzero(mask))); res = []
    while pts:
        st = [pts.pop()]; cur = []
        while st:
            y, x = st.pop(); cur.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    q = (y + dy, x + dx)
                    if q in pts: pts.remove(q); st.append(q)
        res.append((np.array([c[0] for c in cur]), np.array([c[1] for c in cur])))
    return res
here = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(here, '..')
line = float(sys.argv[1]) if len(sys.argv) > 1 else 45; thr = float(sys.argv[2]) if len(sys.argv) > 2 else 1
A = os.path.join(P, r's7\out\s8a'); B = os.environ.get('CHG10_B') or os.path.join(P, r's7\out\s10a'); S5 = os.path.join(P, r's5\out\s5d')
rows = json.load(open(os.path.join(P, 's9', 'out', 'measure.json')))
MZ = ['A_3', 'A_4', 'A_5', 'A_6', 'A_7', 'A_8', 'A_9', 'A_a', 'A_b', 'A_c', 'A_d'] + ['D_%s' % c for c in '123456789a']
g = lambda d: np.asarray(Image.open(os.path.join(d, 'gf_b2.png')).convert('L')).astype(np.int16)
out = []; places = []; balls = {}
for m in MZ:
    va = open(os.path.join(A, m, 'gf_b2view.txt')).readline().strip(); vb = open(os.path.join(B, m, 'gf_b2view.txt')).readline().strip()
    a, b, c5 = g(os.path.join(A, m)), g(os.path.join(B, m)), g(os.path.join(S5, m))
    d = np.abs(a - b) > thr; cc = comps(d)
    mb = [r for r in rows if r['m'] == m]
    out.append('%s view %s  changed px %d in %d places' % (m, 'same' if va == vb else 'DIFFERS %s | %s' % (va, vb), int(d.sum()), len(cc)))
    for ys, xs in cc:
        cx, cy = xs.mean(), ys.mean()
        near = min(mb, key=lambda r: (r['dev'][0] - cx) ** 2 + (r['dev'][1] - cy) ** 2) if mb else None
        dist = ((near['dev'][0] - cx) ** 2 + (near['dev'][1] - cy) ** 2) ** 0.5 if near else 1e9
        places.append(dict(m=m, x=float(cx), y=float(cy), px=int(len(xs)), maxd=int(np.abs(a - b)[ys, xs].max()),
                           ball=near['k'] if near else None, dist=float(dist), side=('tight' if near and near['deg'] < line else 'loose')))
    for r in mb:
        x, y = int(round(r['dev'][0])), int(round(r['dev'][1])); w = (slice(max(y - 30, 0), y + 31), slice(max(x - 30, 0), x + 31))
        balls['%s k%d' % (m, r['k'])] = dict(m=m, k=r['k'], deg=r['deg'], side='tight' if r['deg'] < line else 'loose',
            chg=int(d[w].sum()), s9_vs_s5=int((np.abs(b[w] - c5[w]) > 6).sum()), s8_vs_s5=int((np.abs(a[w] - c5[w]) > 6).sum()),
            s9_vs_s5_1=int((np.abs(b[w] - c5[w]) > 1).sum()))
out.append('\n== changed places (thr %g): maze  x  y  px  maxstep  nearest ball  dist  side' % thr)
for p in places: out.append('%s %5.0f %5.0f %4d %3d  k%s %6.1f  %s%s' % (p['m'], p['x'], p['y'], p['px'], p['maxd'], p['ball'], p['dist'], p['side'], '' if p['dist'] < 30 else '  FAR FROM ANY BALL'))
out.append('\n== per ball (within 30 px): changed s8a->s10a | s8a vs s5 (>6) | s10a vs s5 (>6) | s10a vs s5 (>1)')
for key, r in sorted(balls.items(), key=lambda kv: kv[1]['deg']):
    out.append('%-10s %5.1f %-5s  %4d | %4d | %4d | %4d' % (key, r['deg'], r['side'], r['chg'], r['s8_vs_s5'], r['s9_vs_s5'], r['s9_vs_s5_1']))
open(os.path.join(here, 'out', 'chg10.txt'), 'w').write('\n'.join(out) + '\n')
json.dump(dict(places=places, balls=balls), open(os.path.join(here, 'out', 'chg10.json'), 'w'))
print('\n'.join(out))
