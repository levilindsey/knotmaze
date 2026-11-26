# K1584 s8 Done 7: what cuts each wrong loop's arm. Reads pxwhy.ts box runs (out/eyecut_<m>.txt: every pixel the s8
# column cuts > 0.1) and groups them by label chain, window, which term (1 loop, 2 far), the bake codes and side, with
# whether s6's bake cut them too, their bbox and the mean luminance in today / s4 / s6 / s8.
#   python eyecut.py A_b A_8 A_5
import sys, json, os, collections
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(H, '..')
D = {'today': r's1\out\before', 's4': r's4\out\s4g', 's6': r's6\out\s6a', 's8': r's7\out\s8a'}
def lum(t, m):
    p = os.path.join(K, D[t], m, 'gf_b2.png')
    if not os.path.exists(p): return None
    x = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    return (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
for m in sys.argv[1:]:
    f = os.path.join(H, 'out', f'eyecut_{m}.txt')
    L = {t: lum(t, m) for t in D}; L = {t: v for t, v in L.items() if v is not None}
    lines = open(f).read().splitlines()
    rows = [json.loads(l) for l in lines if l.startswith('{"X')]
    cor = [l for l in lines if l.startswith('corners')]
    print(m, cor[0][:400] if cor else '')
    c = collections.defaultdict(list)
    for d in rows:
        g, g6 = d['g'][2], d['g'][0]
        k = (d['ch'], d['wk'], d['wa'], 'which%d' % g[1], 'pk%d/%d' % (g[4], g[5]), 'side%+d' % int(np.sign(g[7])),
             's6 cut' if g6[0] > 0.1 else 's6 none')
        c[k].append(d)
    for k, v in sorted(c.items(), key=lambda kv: -len(kv[1])):
        xs = [d['X'] for d in v]; ys = [d['Y'] for d in v]
        print('  %3d px' % len(v), k, 'box %d,%d-%d,%d' % (min(xs), min(ys), max(xs), max(ys)),
              'cut %.2f..%.2f' % (min(d['g'][2][0] for d in v), max(d['g'][2][0] for d in v)), 's %.3f..%.3f' % (min(d['s'] for d in v), max(d['s'] for d in v)),
              'lum', ' '.join('%s %.0f' % (t, np.mean([L[t][d['Y'], d['X']] for d in v])) for t in L))
