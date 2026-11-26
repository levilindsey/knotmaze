# K1626 s2: the most stretched segments (rest >= 0.4) of a census.ts state,
# with the ctrl to the nearest joint member on the chain.
#   python strwhere.py <dir> <maze> [n=5]
import json, math, sys
S = json.load(open(f'{sys.argv[1]}/{sys.argv[2]}.json'))
N = int(sys.argv[3]) if len(sys.argv) > 3 else 5
pos = S['positions']; P = lambda i: (pos[2*i], pos[2*i+1])
mem = {}
for J in S['juncs']:
    for c, s in J['members']: mem.setdefault(c, []).append((s, J['id']))
rows = []
for c, ch in enumerate(S['chains']):
    n = len(ch); rs = S['rests'][c]; brk = S['brk'][c]
    for k in range(n):
        if k == brk or rs[k] is None or rs[k] < 0.4: continue
        r = math.dist(P(ch[k]), P(ch[(k+1) % n])) / rs[k]
        dj = min([(min((k - s) % n, (s - k) % n), j) for s, j in mem.get(c, [])], default=(99, -1))
        rows.append((r, c, k, dj, P(ch[k])))
rows.sort(reverse=True)
for r, c, k, dj, p in rows[:N]:
    print(f'x{r:.3f} c{c} s{k} dJ {dj[0]} J{dj[1]} at {p[0]:.2f},{p[1]:.2f}')
