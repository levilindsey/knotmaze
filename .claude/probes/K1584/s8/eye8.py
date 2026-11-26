# K1584 s8 Done 7: what paints the dark eye of a wrong loop. Reads a pxwhy.ts box run with PXALL=1 (every pixel: the
# CPU field's ink, label chain, s, window kind, and per build [cut, which term (1 loop, 2 far), loop cut, far cut, pkL,
# pkR, chain code, side]) and the captures (today s5 s6 s7 s8), and groups the pixels dark in s7 but light today (the
# dark eye) by what the field and the cut say there.
#   python eye8.py <maze> <pxwhy out>
import sys, json, os, collections
import numpy as np
from PIL import Image
K = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
D = {'today': r's1\out\before', 's5': r's5\out\s5d', 's6': r's6\out\s6a', 's7': r's7\out\s7a', 's8': r's7\out\s8a'}
m, f = sys.argv[1], sys.argv[2]
L = {}
for t, d in D.items():
    p = os.path.join(K, d, m, 'gf_b2.png')
    if os.path.exists(p):
        x = np.asarray(Image.open(p).convert('RGB')).astype(np.float32); L[t] = (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
P = [json.loads(l) for l in open(f) if l.startswith('{"X')]
eye = [d for d in P if L['today'][d['Y'], d['X']] - L['s7'][d['Y'], d['X']] > 15]
print(f"{m}: {len(P)} px in the box; dark in s7, light today (> 15 lum): {len(eye)}")
for t in L: print(f"  mean lum of those px, {t}: {np.mean([L[t][d['Y'], d['X']] for d in eye]) if eye else 0:.1f}")
c = collections.Counter()
for d in eye:
    g = d['g'][2] if d.get('g') else None
    c[(d['ch'], d['wk'], d['wa'], 'ink>0.5' if d['ink'] > 0.5 else 'ink<=0.5' if d['ink'] > 0.05 else 'no ink',
       'nokey' if d.get('nokey') else ('cut %.1f term %d loop %.1f far %.1f pk %d/%d' % (g[0], g[1], g[2], g[3], g[4], g[5]) if g else '-'))] += 1
for k, v in c.most_common(): print('  ', v, 'px: chain', k[0], 'win', k[1], k[2], k[3], k[4])
# the field's ink in the box: is the eye inside a thread's ink in the field?
print('  ink over the eye px: mean %.2f, min %.2f' % (np.mean([d['ink'] for d in eye]) if eye else 0, min([d['ink'] for d in eye]) if eye else 0))
