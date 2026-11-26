# K1604 s1: master (m0) -> mine (k1) on all 21 mazes. Every changed pixel of gf_b2.png (gray step > thr) grouped into
# places: 8-connected components, then components whose boxes lie within --join px of each other merged. Each place:
# maze, centre, box, pixel count, max step, and its distance to the two named places (A_3 x278, A_6 x326). Writes a
# places JSON for sheet.py (text = the numbers; n from 1). Also each maze's view line (gf_b2view.txt) when they differ.
#   python chg.py [mine=k1] [thr=0] [master=m0] [--join 12]  -> out/chg_<mine>.txt, out/chg_<mine>.json
import sys, json, os
import numpy as np
from PIL import Image
def dilate(mask, r):
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            s = np.roll(np.roll(mask, dy, 0), dx, 1); out |= s
    return out
def label(mask):  # 8-connected components: an int image and the count
    lab = np.zeros(mask.shape, int); k = 0; H, W = mask.shape
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        k += 1; st = [(y0, x0)]; lab[y0, x0] = k
        while st:
            y, x = st.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]: lab[yy, xx] = k; st.append((yy, xx))
    return lab, k
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
a = [v for v in sys.argv[1:] if not v.startswith('--')]
opt = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
B = a[0] if len(a) > 0 else 'k1'; thr = float(a[1]) if len(a) > 1 else 0.0; A = a[2] if len(a) > 2 else 'm0'
JOIN = int(opt('--join', 12))
MZ = ['A_3', 'A_4', 'A_5', 'A_6', 'A_7', 'A_8', 'A_9', 'A_a', 'A_b', 'A_c', 'A_d', 'D_1', 'D_2', 'D_3', 'D_4', 'D_5', 'D_6', 'D_7', 'D_8', 'D_9', 'D_a']
NAMED = [('A_3', 'x278', 2284.2, 595.4), ('A_6', 'x326', 1897.4, 802.0)]
lines = []; places = []; n = 0
for m in MZ:
    pa, pb = os.path.join(O, A, m, 'gf_b2.png'), os.path.join(O, B, m, 'gf_b2.png')
    if not (os.path.exists(pa) and os.path.exists(pb)): lines.append('%s: MISSING capture' % m); continue
    va = open(os.path.join(O, A, m, 'gf_b2view.txt')).read().split('\n')[0].strip() if os.path.exists(os.path.join(O, A, m, 'gf_b2view.txt')) else ''
    vb = open(os.path.join(O, B, m, 'gf_b2view.txt')).read().split('\n')[0].strip() if os.path.exists(os.path.join(O, B, m, 'gf_b2view.txt')) else ''
    if va != vb: lines.append('%s: VIEW DIFFERS: %s | %s' % (m, va, vb))
    ga = np.asarray(Image.open(pa).convert('L')).astype(np.float32); gb = np.asarray(Image.open(pb).convert('L')).astype(np.float32)
    d = gb - ga; mask = np.abs(d) > thr
    if not mask.any(): lines.append('%s: identical' % m); continue
    grown = dilate(mask, JOIN // 2)
    lab, k = label(grown)
    lines.append('%s: %d changed px in %d places' % (m, int(mask.sum()), k))
    for i in range(1, k + 1):
        ys, xs = np.nonzero(mask & (lab == i))
        if len(ys) == 0: continue
        cx, cy = float(xs.mean()) + 0.5, float(ys.mean()) + 0.5
        dd = d[ys, xs]; near = min(((nm, ((cx - x) ** 2 + (cy - y) ** 2) ** 0.5) for mm, nm, x, y in NAMED if mm == m), key=lambda t: t[1], default=('-', 1e9))
        n += 1
        t = '%s at (%.0f, %.0f), box %d..%d x %d..%d, %d px (%d lighter, %d darker), max step %+.0f / %+.0f; nearest named %s at %.0f px' % (
            m, cx, cy, xs.min(), xs.max(), ys.min(), ys.max(), len(ys), int((dd > 0).sum()), int((dd < 0).sum()), dd.max(), dd.min(), near[0], near[1])
        lines.append('  %2d. %s' % (n, t))
        r = max(4.0, 0.5 * max(xs.max() - xs.min(), ys.max() - ys.min()) + 3)
        places.append({'n': n, 'm': m, 'x': cx, 'y': cy, 'r': r, 'text': t})
open(os.path.join(O, 'chg_%s.txt' % B), 'w').write('\n'.join(lines) + '\n')
json.dump(places, open(os.path.join(O, 'chg_%s.json' % B), 'w'), indent=1)
print('\n'.join(lines))
