# K1627 s3: crossings between a corner's own two arms near their junction (the case the other-arm rule could touch:
# the other arm passing over the nearer one within reach of the corner). python eyex.py [R=2.5] -> per maze, device px.
import json, sys, math, os
R = float(sys.argv[1]) if len(sys.argv) > 1 else 2.5
mz = ['L'] + [f'A_{c}' for c in '3456789abcd'] + [f'D_{c}' for c in '123456789a']
here = os.path.dirname(os.path.abspath(__file__)); out = []
for m in mz:
    sc = json.load(open(os.path.join(here, 'out', 'm0', m, 'scene_gf.json'))); T = sc['camera']['worldToCss']; dpr = sc['camera']['dpr']
    ch = {c['id']: c for c in sc['chains']}
    def at(cid, s):
        p = ch[cid]['pts']; acc = 0.0
        for i in range(len(p) // 2 - 1):
            x0, y0, x1, y1 = p[2*i:2*i+4]; l = math.hypot(x1 - x0, y1 - y0)
            if acc + l >= s and l > 0: t = (s - acc) / l; return (x0 + t * (x1 - x0), y0 + t * (y1 - y0))
            acc += l
        return (p[-2], p[-1])
    seen = set()
    for j in sc['junctions']:
        A = j['arms']; n = len(A)
        for i in range(n):
            a, b = A[i], A[(i + 1) % n]
            if a['chain'] == b['chain']: continue
            for k, x in enumerate(sc['crossings']):
                pa, pb = x['a'], x['b']
                for u, v in ((pa, pb), (pb, pa)):
                    if u['chain'] == a['chain'] and v['chain'] == b['chain'] and abs(u['s'] - a['s']) < R and abs(v['s'] - b['s']) < R and (m, k) not in seen:
                        seen.add((m, k)); w = at(pa['chain'], pa['s'])
                        d = ((T[0]*w[0] + T[4]) * dpr, (T[3]*w[1] + T[5]) * dpr)
                        out.append((m, k, j['id'], x[x['over']]['chain'], round(d[0]), round(d[1]), round(math.hypot(w[0]-j['c'][0], w[1]-j['c'][1]), 2)))
for o in out: print(o)
print('count', len(out))
json.dump([{'n': i + 1, 'm': o[0], 'x': o[4], 'y': o[5], 'r': 14, 'text': f'x{o[1]} between the arms of a corner of {o[2]} ({o[6]} world)'} for i, o in enumerate(out)], open(os.path.join(here, 'out', 'places_eyex.json'), 'w'))
