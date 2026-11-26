# K1584 s12 (from s11/chg11.py): master (m12) -> stage 12 (B, default s12a) on all 21 mazes. Every changed pixel (gray
# step > thr) of gf_b2.png, grouped into places (8-connected after a dilation by --join px, so one border's pixels are
# one place); each place gets the nearest changed gap-table run (tabdiff12's out/tab/<maze>.json, each run's sample
# device positions) and its distance. A place 40 px or more from every changed run is NOT EXPLAINED by the table
# change (the brief: every other pixel equals master's). Also the view lines (gf_b2view.txt) per maze.
#   python chg12.py [B=s12a] [thr=0] [A=m12] [--join 3]  -> out/chg12_<B>.txt, out/chg12_<B>.json
import sys, json, os
import numpy as np
from PIL import Image
a = sys.argv[1:]
J = 3
if '--join' in a: i = a.index('--join'); J = int(a[i + 1]); del a[i:i + 2]
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
def dil(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
Bt = a[0] if len(a) > 0 else 's12a'; thr = float(a[1]) if len(a) > 1 else 0
At = a[2] if len(a) > 2 else 'm12'
A = os.path.join(O, At); B = os.path.join(O, Bt)
MZ = ['A_3', 'A_4', 'A_5', 'A_6', 'A_7', 'A_8', 'A_9', 'A_a', 'A_b', 'A_c', 'A_d'] + ['D_%s' % c for c in '123456789a']
g = lambda d: np.asarray(Image.open(os.path.join(d, 'gf_b2.png')).convert('L')).astype(np.int16)
out = []; places = []; tot = 0; far = 0; hit = {}
for m in MZ:
    va = open(os.path.join(A, m, 'gf_b2view.txt')).readline().strip(); vb = open(os.path.join(B, m, 'gf_b2view.txt')).readline().strip()
    ga, gb = g(os.path.join(A, m)), g(os.path.join(B, m))
    d = np.abs(ga - gb) > thr; tot += int(d.sum())
    T = json.load(open(os.path.join(O, 'tab', m + '.json')))['places']
    runs = [(ri, np.array(r['devs'], np.float64)) for ri, r in enumerate(T)]
    cc = [(ys, xs) for ys, xs in comps(dil(d, J)) ]
    cc = [(ys[d[ys, xs]], xs[d[ys, xs]]) for ys, xs in cc]
    cc = [c for c in cc if len(c[0])]
    out.append('%s view %s  changed px %d in %d places; %d table runs' % (m, 'same' if va == vb else 'DIFFERS %s | %s' % (va, vb), int(d.sum()), len(cc), len(T)))
    for ys, xs in cc:
        cx, cy = xs.mean(), ys.mean(); best = (1e9, -1)
        for ri, P in runs:
            dd = np.sqrt(((P[:, 0][None, :] - xs[:, None]) ** 2 + (P[:, 1][None, :] - ys[:, None]) ** 2)).min()
            if dd < best[0]: best = (float(dd), ri)
        if best[0] >= 40: far += 1
        r = T[best[1]] if best[1] >= 0 else None
        if r is not None: hit.setdefault(m, set()).add(best[1])
        places.append(dict(m=m, x=float(cx), y=float(cy), x0=int(xs.min()), y0=int(ys.min()), x1=int(xs.max()), y1=int(ys.max()),
                           px=int(len(xs)), maxd=int(np.abs(ga - gb)[ys, xs].max()), run=best[1], dist=best[0],
                           c=r['c'] if r else None, xi=(r['x'] or {}).get('i') if r else None, o=(r['x'] or {}).get('o') if r else None,
                           codes=('%s -> %s' % (r['m'], r['s12'])) if r else ''))
out.append('\n== changed places (thr %g): maze  x  y  px  maxstep  nearest run: chain x<crossing>(o<over>)  dist  codes' % thr)
for p in places: out.append('%s %5.0f %5.0f %4d %3d  c%s x%s(o%s) %5.1f  %s%s' % (p['m'], p['x'], p['y'], p['px'], p['maxd'], p['c'], p['xi'], p['o'], p['dist'], p['codes'], '' if p['dist'] < 40 else '  NOT EXPLAINED'))
nr = sum(len(json.load(open(os.path.join(O, 'tab', m + '.json')))['places']) for m in MZ)
nh = sum(len(v) for v in hit.values())
out.append('\n%s -> %s: %d changed px in %d places, %d not explained by a changed table run; %d of %d table runs have a changed place' % (At, Bt, tot, len(places), far, nh, nr))
open(os.path.join(O, 'chg12_%s.txt' % Bt), 'w').write('\n'.join(out) + '\n')
json.dump(dict(places=places), open(os.path.join(O, 'chg12_%s.json' % Bt), 'w'))
print('\n'.join(out[-1:]))
