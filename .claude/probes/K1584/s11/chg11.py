# K1584 s11 (from the gap worktree's s10/chg10.py): master (m11) -> stage 11 (B, default s11a) on all 21 mazes. Every
# changed pixel (gray step > thr) of gf_b2.png grouped into 8-connected places; each place gets its nearest of the
# three wedge balls (A_3 k63, A_5 k176, A_6 k265) and its distance; a place 30 px or more from all three is NOT ALLOWED
# (the brief: every other pixel equals master's). Also the view lines (gf_b2view.txt) per maze.
#   python chg11.py [B=s11a] [thr=0] [A=m11]  -> out/chg11_<B>.txt, out/chg11_<B>.json
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
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
Bt = sys.argv[1] if len(sys.argv) > 1 else 's11a'; thr = float(sys.argv[2]) if len(sys.argv) > 2 else 0
At = sys.argv[3] if len(sys.argv) > 3 else 'm11'
A = os.path.join(O, At); B = os.path.join(O, Bt)
BALLS = [('A_3', 63, 1056.0, 266.1), ('A_5', 176, 2343.7, 507.6), ('A_6', 265, 2304.5, 815.5)]
MZ = ['A_3', 'A_4', 'A_5', 'A_6', 'A_7', 'A_8', 'A_9', 'A_a', 'A_b', 'A_c', 'A_d'] + ['D_%s' % c for c in '123456789a']
g = lambda d: np.asarray(Image.open(os.path.join(d, 'gf_b2.png')).convert('L')).astype(np.int16)
out = []; places = []; tot = 0; far = 0
for m in MZ:
    va = open(os.path.join(A, m, 'gf_b2view.txt')).readline().strip(); vb = open(os.path.join(B, m, 'gf_b2view.txt')).readline().strip()
    a, b = g(os.path.join(A, m)), g(os.path.join(B, m))
    d = np.abs(a - b) > thr; cc = comps(d); tot += int(d.sum())
    out.append('%s view %s  changed px %d in %d places' % (m, 'same' if va == vb else 'DIFFERS %s | %s' % (va, vb), int(d.sum()), len(cc)))
    for ys, xs in cc:
        cx, cy = xs.mean(), ys.mean()
        mb = [r for r in BALLS if r[0] == m]
        near = min(mb, key=lambda r: (r[2] - cx) ** 2 + (r[3] - cy) ** 2) if mb else None
        dist = ((near[2] - cx) ** 2 + (near[3] - cy) ** 2) ** 0.5 if near else 1e9
        dmax = float(max(((xs - near[2]) ** 2 + (ys - near[3]) ** 2) ** 0.5)) if near else 1e9
        if dist >= 30: far += 1
        places.append(dict(m=m, x=float(cx), y=float(cy), px=int(len(xs)), maxd=int(np.abs(a - b)[ys, xs].max()),
                           ball=near[1] if near else None, dist=float(dist), reach=dmax))
out.append('\n== changed places (thr %g): maze  x  y  px  maxstep  nearest wedge ball  centroid dist  farthest px' % thr)
for p in places: out.append('%s %5.0f %5.0f %4d %3d  k%s %6.1f %6.1f%s' % (p['m'], p['x'], p['y'], p['px'], p['maxd'], p['ball'], p['dist'], p['reach'], '' if p['dist'] < 30 else '  NOT AT A WEDGE BALL'))
out.append('\n%s -> %s: %d changed px in %d places, %d not at a wedge ball' % (At, Bt, tot, len(places), far))
open(os.path.join(O, 'chg11_%s.txt' % Bt), 'w').write('\n'.join(out) + '\n')
json.dump(dict(places=places), open(os.path.join(O, 'chg11_%s.json' % Bt), 'w'))
print('\n'.join(out))
