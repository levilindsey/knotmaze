# K1626 s2: where the sharp turns (> 60 deg) sit, per census dir: each
# turn's chain/slot, angle, ctrl to the nearest joint member and nearest
# pass on its chain. Summary per maze: at a joint (<= 0.5 ctrl), within 1
# ctrl of one, at a pass (<= 0.6), elsewhere.
#   python sharp.py <dir> [maze] [verbose]
import json, math, sys
d = sys.argv[1]
names = [sys.argv[2]] if len(sys.argv) > 2 and sys.argv[2] != 'all' else ['L'] + ['D_' + c for c in '123456789a']
verbose = len(sys.argv) > 3
for nm in names:
    S = json.load(open(f'{d}/{nm}.json'))
    pos = S['positions']; P = lambda i: (pos[2*i], pos[2*i+1])
    mem = {}
    for J in S['juncs']:
        for c, s in J['members']: mem.setdefault(c, []).append((s, J['id']))
    pas = {}
    for X in S['xs']:
        for side in ('over', 'under'):
            pas.setdefault(X[side]['chain'], []).append(X[side]['ctrl'])
    cls = {'joint': 0, 'near1': 0, 'near2': 0, 'pass': 0, 'else': 0}
    for c, ch in enumerate(S['chains']):
        brk = S['brk'][c]; n = len(ch)
        cyc = lambda v: min(v % n, (-v) % n)
        for k in range(n):
            if brk >= 0 and (k == brk or (k - 1) % n == brk or k == 0 and brk == n-1): continue
            p0, p1, p2 = P(ch[(k-1) % n]), P(ch[k]), P(ch[(k+1) % n])
            v1 = (p1[0]-p0[0], p1[1]-p0[1]); v2 = (p2[0]-p1[0], p2[1]-p1[1])
            n1, n2 = math.hypot(*v1), math.hypot(*v2)
            if n1 < 1e-9 or n2 < 1e-9: continue
            cv = (v1[0]*v2[0] + v1[1]*v2[1]) / (n1*n2)
            if cv >= 0.5: continue
            dj = min([cyc(k - s) for s, _ in mem.get(c, [])], default=99)
            dp = min([cyc(k - q) for q in pas.get(c, [])], default=99)
            key = 'joint' if dj <= 0.5 else 'near1' if dj <= 1 else 'near2' if dj <= 2 else 'pass' if dp <= 0.6 else 'else'
            cls[key] += 1
            if verbose:
                jid = [j for s, j in mem.get(c, []) if cyc(k - s) == dj]
                print(f'  {nm} c{c} s{k} turn {math.degrees(math.acos(max(-1, min(1, cv)))):.0f} dJ {dj:.0f} J{jid[:1]} dPass {dp:.2f} at {p1[0]:.2f},{p1[1]:.2f}')
    print(nm, cls)
