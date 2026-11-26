# K1584 s8 Done 7: each loop's own crossing in the bake. For the 3 wrong and 12 right loops, the bake crossing (the
# `corners` line of pxwhy.ts's box run, out/eyecut_<m>[_x<i>].txt: [k, over, under, s over, s under, X, Y]) with s5's
# over/under chains, nearest the s5 dev point; today's luminance there (on a thread, or in the eye) and the px within 12
# of it that s4 / s8 cut against today. Prints sheet8 place args centred on each.
#   python eyek.py
import json, os
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(H, '..')
D = {'today': r's1\out\before', 's4': r's4\out\s4g', 's8': r's7\out\s8a'}
_l = {}
def lum(t, m):
    p = os.path.join(K, D[t], m, 'gf_b2.png')
    if p not in _l:
        x = np.asarray(Image.open(p).convert('RGB')).astype(np.float32); _l[p] = (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
    return _l[p]
L = [('wrong', 'A_b', 75, ''), ('wrong', 'A_8', 65, ''), ('wrong', 'A_5', 277, '')]
for m, i in (('A_3', 49), ('D_9', 264), ('A_6', 119), ('A_3', 102), ('A_c', 75), ('A_3', 192), ('A_7', 81), ('A_d', 241),
             ('A_c', 102), ('A_7', 158), ('A_4', 343), ('A_4', 5)):
    L.append(('right', m, i, f'_x{i}'))
args = []
for g, m, i, suf in L:
    c = {x['i']: x for x in json.load(open(os.path.join(K, 's5', 'cnt', f'{m}_s5d.json')))['crossings']}[i]
    lines = open(os.path.join(H, 'out', f'eyecut_{m}{suf}.txt')).read().splitlines()
    cor = json.loads([l for l in lines if l.startswith('corners')][0][8:])
    dx, dy = c['dev']
    cand = [k for k in cor if k[1] == c['over'] and k[2] == c['under']]
    if not cand: print(f'{g} {m} x{i}: no bake crossing {c["over"]} over {c["under"]} in {cor}'); continue
    k = min(cand, key=lambda k: (k[5] - dx) ** 2 + (k[6] - dy) ** 2)
    X, Y = k[5], k[6]
    a = lum('today', m)
    n = {t: int(((lum(t, m)[Y - 12:Y + 13, X - 12:X + 13] - a[Y - 12:Y + 13, X - 12:X + 13]) > 3).sum()) for t in ('s4', 's8')}
    print(f'{g:5s} {m} x{i}: k{k[0]} {k[1]} over {k[2]} at ({X},{Y}), {((X - dx) ** 2 + (Y - dy) ** 2) ** 0.5:.0f} px from dev; '
          f'today lum there {a[Y, X]:.0f} ({"on ink" if a[Y, X] < 23 else "light"}); cut vs today within 12 px: s4 {n["s4"]} s8 {n["s8"]}')
    args.append(f'{m}:@:{X}:{Y}:{g[0]}x{i}k{k[0]}')
print(' '.join(args))
