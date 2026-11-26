# K1584 s9: where s9a still differs from stage 5 (s5d) near a loose-side ball (chg9.py's last column but one), which
# stage put that difference there: per pixel (> 6 levels, within 30 px of the ball's centre) whether stage 6 (s5d ->
# s6a), stage 7 (s6a -> s7a) or stage 8 (s7a -> s8a) changed it by > 6. A pixel only stage 6 touched and s9a still
# holds is the wedge left behind (a failure of the rule); one stage 7 or 8 touched is their change, not the wedge's.
# CAUTION (found on the run): "s6 only" does not prove the wedge. A stage 7 rule that adds ink where the wedge had
# already inked shows no s6a -> s7a change. The last column settles it: the pixels inside a stage 7 mirror place
# (s7/out/px/<maze>.json, pxdiff.ts: rule K or C adding ink there in the no-wedge model, bbox + 1 px).
#   python res9.py [line_deg=42.5]     (one capture session per set; all share each maze's physics hash)
import sys, json, os
import numpy as np
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(here, '..')
line = float(sys.argv[1]) if len(sys.argv) > 1 else 42.5
D = dict(s5=r's5\out\s5d', s6=r's6\out\s6a', s7=r's7\out\s7a', s8=r's7\out\s8a', s9=r's7\out\s9a')
rows = json.load(open(os.path.join(here, 'out', 'measure.json'))); cache = {}
def g(k, m):
    if (k, m) not in cache: cache[(k, m)] = np.asarray(Image.open(os.path.join(P, D[k], m, 'gf_b2.png')).convert('L')).astype(np.int16)
    return cache[(k, m)]
PX = {}
def inmirror(m, xx, yy):
    if m not in PX: PX[m] = json.load(open(os.path.join(P, r's7\out\px', m + '.json')))['places']
    return any(p.get('bbox') and p['bbox'][0] - 1 <= xx <= p['bbox'][2] + 1 and p['bbox'][1] - 1 <= yy <= p['bbox'][3] + 1 for p in PX[m])
print('ball            deg  side   s9!=s5 | by s6 only | s7 | s8 | none of them | in a rule K/C mirror place  (px > 6 within 30 px)')
for r in sorted(rows, key=lambda r: r['deg']):
    m = r['m']; x, y = int(round(r['dev'][0])), int(round(r['dev'][1])); w = (slice(max(y - 30, 0), y + 31), slice(max(x - 30, 0), x + 31))
    I = {k: g(k, m)[w] for k in D}; T = 6
    res = np.abs(I['s9'] - I['s5']) > T
    if not res.any(): continue
    c6 = np.abs(I['s6'] - I['s5']) > T; c7 = np.abs(I['s7'] - I['s6']) > T; c8 = np.abs(I['s8'] - I['s7']) > T
    only6 = res & c6 & ~c7 & ~c8; by7 = res & c7; by8 = res & c8 & ~c7; none = res & ~c6 & ~c7 & ~c8
    ys, xs = np.nonzero(res); inm = sum(inmirror(m, xx + w[1].start, yy + w[0].start) for yy, xx in zip(ys, xs))
    print('%-4s k%-4d %6.1f %-5s  %5d | %5d | %3d | %3d | %3d | %3d' % (m, r['k'], r['deg'], 'tight' if r['deg'] < line else 'loose',
          int(res.sum()), int(only6.sum()), int(by7.sum()), int(by8.sum()), int(none.sum()), inm))
