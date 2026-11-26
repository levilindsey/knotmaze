# K1584 s5: the "home case" per crossing side: does a junction whose through arms lie on the under chain, with an END
# arm (another thread ending on the under thread), sit within 4h = 1.6 world of the crossing? Also, for the 27 A_3
# sides, how many capture pixels changed within 30 px of the crossing between s4g and s5d.
#   python homecase.py [sfx=s5d]     -> prints both tables (markdown)
import json, os, re, sys, math
import numpy as np
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); K = os.path.dirname(here)
sfx = sys.argv[1] if len(sys.argv) > 1 else 's5d'
_s = {}
def scene(m):
    if m not in _s: _s[m] = json.load(open(os.path.join(here, 'out', 's5d', m, 'scene_gf.json')))
    return _s[m]
def home(m, x):
    S = scene(m); u = x['under']; best = None
    for j in S['junctions']:
        th = [a for a in j['arms'] if a['chain'] == u and a['kind'] == 'through']
        en = [a for a in j['arms'] if a['kind'] == 'end' and a['chain'] != u]
        if not th or not en: continue
        d = math.hypot(j['c'][0] - x['wx'], j['c'][1] - x['wy'])
        if d <= 1.6 and (best is None or d < best[1]): best = (j['id'], d, th[0]['s'])
    return best
def cnt(m, s):
    p = os.path.join(K, s, 'cnt', f'{m}_{"s4" if s == "s4" else sfx}.json')
    return {x['i']: x for x in json.load(open(p))['crossings']}
def lum(p): return np.asarray(Image.open(p).convert('L')).astype(np.float32)
def side_of(m, x, d, jh):
    # which side of the crossing the junction sits on, along the under chain (+1 / -1), from the scene crossing's s
    c = scene(m)['crossings'][x['i']]; us = c['a']['s'] if c['a']['chain'] == x['under'] else c['b']['s']
    return 1 if jh[2] > us else -1
print('## The 27 A_3 sides stage 4 counted as closed or reads-closed\n')
print('| side | s4 | s5 | px changed s4g->s5d within 30 px | home case (junction, dist, on this side) |\n|---|---|---|---|---|')
C4, C5 = cnt('A_3', 's4'), cnt('A_3', 's5')
L4 = lum(os.path.join(K, 's4', 'out', 's4g', 'A_3', 'gf_b2.png')); L5 = lum(os.path.join(here, 'out', 's5d', 'A_3', 'gf_b2.png'))
yy, xx = np.mgrid[0:L4.shape[0], 0:L4.shape[1]]
for ln in open(os.path.join(K, 's4', 'counts_s4_list.md')):
    q = re.match(r'A_3 (closed|weak) x(\d+) dir (-?1) lat (-?1)', ln)
    if not q: continue
    kind, i, d, l = q.group(1), int(q.group(2)), int(q.group(3)), int(q.group(4))
    x = C5[i]; b = next(b for b in x['borders'] if b['dir'] == d and b['lat'] == l)
    cx, cy = int(x['dev'][0]), int(x['dev'][1]) + 25
    win = (slice(cy - 30, cy + 31), slice(cx - 30, cx + 31))
    ch = int((np.abs(L5[win] - L4[win]) > 6).sum())
    h = home('A_3', x); hs = f"{h[0]} {h[1]:.2f} {'yes' if side_of('A_3', x, d, h) == d else 'no'}" if h else '-'
    print(f"| x{i} d{d:+d} l{l:+d} | {kind} | {b['path']} {b['keepM'] if b['keepM'] is None else round(b['keepM'], 2)} | {ch} | {hs} |")
print('\n## Sides still not reading as a gap in the model (' + sfx + '), all 21 mazes\n')
print('| maze | side | path keep | self | home case (junction, dist, on this side) |\n|---|---|---|---|---|')
for f in sorted(os.listdir(os.path.join(here, 'cnt'))):
    if not f.endswith(f'_{sfx}.json'): continue
    m = f[:3]
    for x in json.load(open(os.path.join(here, 'cnt', f)))['crossings']:
        for b in x['borders']:
            k = b['keepM']
            if b['path'] in ('closed', 'flag', 'stolen', 'none') or (b['path'] in ('scale', 'window', 'full') and k is not None and k == k and k > 0.8):
                h = home(m, x); hs = f"{h[0]} {h[1]:.2f} {'yes' if side_of(m, x, b['dir'], h) == b['dir'] else 'no'}" if h else '-'
                print(f"| {m} | x{x['i']} d{b['dir']:+d} l{b['lat']:+d} | {b['path']} {k if k is None else round(k, 2)} | {'self' if x['self'] else ''} | {hs} |")
