# K1584: solid ink blobs ("balls": tight turns and tail ends drawn as a filled dot) in today's capture, and how
# much of each one's ink a later capture removes.
#   python balls.py <today template> <capA template> <capB template> <out.json>
# A blob = a connected set of today's ink pixels that survive CORE erosions (a border line is 4 px wide and is
# gone after 2 or 3). Markers and other large shapes (pixels surviving BIG erosions) are skipped.
import sys, json, collections
import numpy as np
from PIL import Image
T, A, B, out = sys.argv[1:5]
MZ = ['A_%s' % c for c in '3456789abcd'] + ['D_%s' % c for c in '123456789a']
CORE, BIG, R = 5, 12, 13
def ink(p):
    g = np.asarray(Image.open(p + r'\gf_b2.png').convert('L')).astype(np.float32)
    return np.clip((23.5 - g) / 3.5, 0, 1)
def erode(m, eight):
    p = np.pad(m, 1)
    o = p[1:-1, 1:-1] & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    if eight: o = o & p[:-2, :-2] & p[:-2, 2:] & p[2:, :-2] & p[2:, 2:]
    return o
res = []
for m in MZ:
    t = ink(T.replace('{m}', m)); a = ink(A.replace('{m}', m)); b = ink(B.replace('{m}', m))
    e = t > 0.5
    e = ~erode(~e, True); e = erode(e, True)   # close pinholes (a ball with a speck is still a ball)
    depth = np.zeros(t.shape, np.int16)
    for k in range(BIG + 1):
        e = erode(e, k % 2 == 1); depth[e] = k + 1
    core = depth >= CORE
    pts = set(map(tuple, np.argwhere(core)))
    while pts:
        s = pts.pop(); q = [s]; comp = [s]
        while q:
            y, x = q.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    n = (y + dy, x + dx)
                    if n in pts: pts.remove(n); q.append(n); comp.append(n)
        ys = np.array([c[0] for c in comp]); xs = np.array([c[1] for c in comp])
        mx = int(depth[ys, xs].max())
        if mx > BIG: continue
        cy, cx = float(ys.mean()), float(xs.mean())
        y0, y1 = int(max(0, cy - R)), int(cy + R + 1); x0, x1 = int(max(0, cx - R)), int(cx + R + 1)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        w = (np.hypot(yy - cy, xx - cx) <= mx + 2.5) & (t[y0:y1, x0:x1] > 0.5)
        tot = int(w.sum())
        la = int((w & (a[y0:y1, x0:x1] < 0.5)).sum()); lb = int((w & (b[y0:y1, x0:x1] < 0.5)).sum())
        res.append({'m': m, 'x': round(cx, 1), 'y': round(cy, 1), 'r': mx, 'n': len(comp), 'px': tot, 'lostA': la, 'lostB': lb})
json.dump(res, open(out, 'w'))
print('blobs', len(res), 'by depth', dict(sorted(collections.Counter(r['r'] for r in res).items())))
for nm, key in (('last step', 'lostA'), ('now', 'lostB')):
    print(nm, {th: sum(1 for r in res if r[key] >= th) for th in (4, 10, 25)})
print('now, lost >= 10 px, per maze:', dict(collections.Counter(r['m'] for r in res if r['lostB'] >= 10)))
for r in sorted(res, key=lambda r: -r['lostB'])[:30]: print(r)

