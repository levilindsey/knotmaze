# K1584 s8 Done 7: find the dark eye. Per loop place (the 3 wrong, the 12 right), the pixels within R of the crossing's
# dev point that are lighter today than in s8 by > 3 (ink where today has none), as connected pieces with bbox and
# size, and the mean luminance of the biggest piece in each capture (today s4 s5 s6 s7 s8): which stage made it dark.
#   python eyefind.py [R=48]   -> out/eyes.json (bboxes for pxwhy.ts PXALL runs)
import sys, json, os
import numpy as np
from PIL import Image
def label(mask):  # 8-connected pieces (no scipy here)
    lab = np.zeros(mask.shape, np.int32); n = 0
    for sy, sx in zip(*np.nonzero(mask)):
        if lab[sy, sx]: continue
        n += 1; st = [(sy, sx)]; lab[sy, sx] = n
        while st:
            y, x = st.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < mask.shape[0] and 0 <= xx < mask.shape[1] and mask[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; st.append((yy, xx))
    return lab, n
H =os.path.dirname(os.path.abspath(__file__)); K = os.path.join(H, '..')
R = int(sys.argv[1]) if len(sys.argv) > 1 else 48
D = {'today': r's1\out\before', 's4': r's4\out\s4g', 's5': r's5\out\s5d', 's6': r's6\out\s6a', 's7': r's7\out\s7a', 's8': r's7\out\s8a'}
WRONG = [('A_b', 75), ('A_8', 65), ('A_5', 277)]
RIGHT = [('A_3', 49), ('D_9', 264), ('A_6', 119), ('A_3', 102), ('A_c', 75), ('A_3', 192), ('A_7', 81), ('A_d', 241),
         ('A_c', 102), ('A_7', 158), ('A_4', 343), ('A_4', 5)]
_c, _l = {}, {}
def dev(m, i):
    if m not in _c: _c[m] = {x['i']: x for x in json.load(open(os.path.join(K, 's5', 'cnt', f'{m}_s5d.json')))['crossings']}
    return _c[m][i]['dev']
def lum(t, m):
    p = os.path.join(K, D[t], m, 'gf_b2.png')
    if p not in _l:
        if not os.path.exists(p): _l[p] = None
        else:
            x = np.asarray(Image.open(p).convert('RGB')).astype(np.float32); _l[p] = (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
    return _l[p]
out = {}
for grp, L in (('wrong', WRONG), ('right', RIGHT)):
    print(f'== {grp} loops')
    for m, i in L:
        X, Y = dev(m, i); cx, cy = int(round(X)), int(round(Y))
        a, b = lum('today', m), lum('s8', m)
        y0, y1, x0, x1 = cy - R, cy + R, cx - R, cx + R
        d = a[y0:y1, x0:x1] - b[y0:y1, x0:x1]
        lab, n = label(d > 3)
        pcs = []
        for k in range(1, n + 1):
            ys, xs = np.nonzero(lab == k)
            if len(ys) < 4: continue
            pcs.append({'n': int(len(ys)), 'box': [int(xs.min() + x0), int(ys.min() + y0), int(xs.max() + x0), int(ys.max() + y0)],
                        'lum': {t: round(float(np.mean(lum(t, m)[ys + y0, xs + x0])), 1) for t in D if lum(t, m) is not None}})
        pcs.sort(key=lambda p: -p['n'])
        out[f'{m} x{i}'] = {'grp': grp, 'dev': [cx, cy], 'pieces': pcs}
        print(f'  {m} x{i} ({cx},{cy}): {len(pcs)} pieces >= 4 px' + ''.join(f"\n     {p['n']:4d} px box {p['box']} lum {p['lum']}" for p in pcs[:4]))
json.dump(out, open(os.path.join(H, 'out', 'eyes.json'), 'w'), indent=1)
