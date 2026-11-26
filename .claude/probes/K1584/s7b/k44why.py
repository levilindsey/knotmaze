# K1584 s7b: why rule K's table change moves no pixel at most of K1601's 44 crossings. Per changed side (K1601's
# s5d march records, rulek.py's side_k), each border's gap reach (its cut or silhouette start + FADE) against the old
# window w and rule K's window kw. A border whose gap ends inside kw cannot change when the window shrinks to kw.
#   python k44why.py    (run with K1601's probe dir on sys.path; reads out/k1601_44.txt and out/s7places.json)
import json, os, re, sys
K1601 = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1584-s7\.claude\probes\K1601'
sys.path.insert(0, K1601)
_src = open(os.path.join(K1601, 'rulek.py')).read(); exec(_src[:_src.index("if sys.argv[1] == 'list'")])
from marchcensus import nn
H = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(H, 'out', 's7places.json')))
for ln in open(os.path.join(H, 'out', 'k1601_44.txt')):
    m = re.match(r'(\S+) x(\d+) ', ln)
    if not m: continue
    mz, xi = m[1], int(m[2])
    J = json.load(open(os.path.join(K1601, 'out', 'march', f'{mz}_s5d.json')))
    x = next(x for x in J['xs'] if x['i'] == xi)
    px = sum(g['n'] for g in G if g['m'] == mz and g['rule'] == 'K' and xi in g['xs'])
    out = []
    for s in x['march'] or []:
        w = x['wn'] if s['dir'] < 0 else x['wp']
        k4s, kw = side_k(s, w)
        if not k4s: continue
        bs = []
        for b in (0, 1):
            g0 = s['cutB'][b] if nn(s['cutB'][b]) else s['silB'][b]
            reach = (g0 + FADE) if nn(g0) else None
            bs.append(f"b{b}{'k4' if b in k4s else ''} g0 {g0 if g0 is None else round(g0, 3)} reach {reach if reach is None else round(reach, 3)} end {s['endB'][b] if not nn(s['endB'][b]) else round(s['endB'][b], 3)} rB {round(s['rB'][b], 3) if s['rB'][b] < 1e5 else 'inf'}")
        reachmax = max([(s['cutB'][b] if nn(s['cutB'][b]) else s['silB'][b]) + FADE for b in (0, 1) if nn(s['cutB'][b] if nn(s['cutB'][b]) else s['silB'][b])], default=None)
        out.append(f"dir {s['dir']:+d} w {w:.3f} kw {kw:.3f} max reach {reachmax if reachmax is None else round(reachmax, 3)} {'INSIDE' if reachmax is not None and reachmax <= kw + 1e-6 else 'PAST'} all {s['all'] if not nn(s['all']) else round(s['all'], 3)} :: " + ' | '.join(bs))
    print(f'{mz} x{xi:<4d} px {px:3d}  ' + ' ;; '.join(out))
