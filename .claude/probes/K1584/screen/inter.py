# K1588: where the junction rule acts differently on top of the gap step (stage 5) than it did on the last step
# (stage 4). d1 = ink(s4 + rule) - ink(s4), d2 = ink(s5 + rule) - ink(s5); a pixel interacts when |d2 - d1| > 0.5.
# Places = interacting pixels merged within 12 px. Each place lists the px the rule changed there in either build.
#   python inter.py <sideJsonDir> <s4 tmpl> <s4+rule tmpl> <s5 tmpl> <s5+rule tmpl> <out.json>     (templates hold {m})
import sys, json, glob, os
import numpy as np
from PIL import Image
sp, t4, t4j, t5, t5j, out = sys.argv[1:7]
def ink(p):
    a = np.asarray(Image.open(p).convert('L')).astype(np.float32)
    return np.clip((23.5 - a) / 3.5, 0, 1)
res = []; T = dict(d1=0, d2=0, inter=0)
for f in sorted(glob.glob(os.path.join(sp, '[AD]_?.json'))):
    m = os.path.basename(f)[:-5]
    I = [ink(t.replace('{m}', m) + r'\gf_b2.png') for t in (t4, t4j, t5, t5j)]
    d1 = I[1] - I[0]; d2 = I[3] - I[2]; e = d2 - d1
    c1 = np.abs(d1) > 0.5; c2 = np.abs(d2) > 0.5
    ys, xs = np.nonzero(np.abs(e) > 0.5)
    S = json.load(open(f))['sides']; al = [(s['at'][0], s['at'][1], s['i']) for s in S if s.get('at')]
    cells = {}
    for x, y in zip(xs, ys): cells.setdefault((x // 12, y // 12), []).append((x, y))
    seen = set(); n = 0
    for c in list(cells):
        if c in seen: continue
        st = [c]; seen.add(c); pts = []
        while st:
            q = st.pop(); pts += cells[q]
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    r = (q[0] + dx, q[1] + dy)
                    if r in cells and r not in seen: seen.add(r); st.append(r)
        P = np.array(pts); cx, cy = float(P[:, 0].mean()), float(P[:, 1].mean())
        x0, x1, y0, y1 = P[:, 0].min() - 6, P[:, 0].max() + 7, P[:, 1].min() - 6, P[:, 1].max() + 7
        x0 = max(x0, 0); y0 = max(y0, 0)
        xi = min(al, key=lambda t: (t[0] - cx) ** 2 + (t[1] - cy) ** 2)[2] if al else -1
        res.append(dict(m=m, x=round(cx, 1), y=round(cy, 1), px=len(pts), on4=int(c1[y0:y1, x0:x1].sum()), on5=int(c2[y0:y1, x0:x1].sum()),
                        add5=int((d2[y0:y1, x0:x1] > 0.5).sum()), xi=xi)); n += 1
    T['d1'] += int(c1.sum()); T['d2'] += int(c2.sum()); T['inter'] += len(xs)
    print(m, 'rule on s4', int(c1.sum()), 'px; on s5', int(c2.sum()), 'px; differs', len(xs), 'px in', n, 'places', flush=True)
print('ALL', T, 'places', len(res), 'of >= 10 px', sum(1 for r in res if r['px'] >= 10))
json.dump(res, open(out, 'w'))
