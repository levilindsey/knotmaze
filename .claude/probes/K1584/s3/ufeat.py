import json, sys, math
A = json.load(open('A_3_ja.json')); B = json.load(open('A_3_ja_u.json'))
S = json.load(open(r'out\ja\A_3\sites_gf.json'))['sites']
J = [(s['site'], s['x'], s['y']) for s in S if s['site'].startswith('j')]
named = {40: 'j15', 41: 'j15', 56: 'j22', 57: 'j22', 269: 't65s', 207: 'j148', 119: 'j88', 339: 't80s', 29: 't57e'}
b1 = {97, 98, 99, 104, 168, 169, 170, 332, 233}
pb = {(x['i'], b['dir'], b['lat']): b['path'] for x in B['crossings'] for b in x['borders']}
rows = []
for x in A['crossings']:
    for b in x['borders']:
        if b['path'] != 'flag' or pb.get((x['i'], b['dir'], b['lat'])) == 'flag': continue
        P = b['pts']; px, py = P[0], P[1]
        dj, nj = min((math.hypot(px - jx, py - jy), n) for n, jx, jy in J)
        tag = named.get(x['i'], 'b1' if x['i'] in b1 else '')
        rows.append((dj, tag, x['i'], b['dir'], b['lat'], b['dUm'], pb[(x['i'], b['dir'], b['lat'])], nj))
rows.sort()
for r in rows:
    if r[1] or r[0] < 30: print('%5.1fpx %-5s x%d %+d%+d dUm%s ->%s %s' % r)
import collections
h = collections.Counter(int(r[0] // 10) * 10 for r in rows); print(sorted(h.items())); print('n', len(rows))

