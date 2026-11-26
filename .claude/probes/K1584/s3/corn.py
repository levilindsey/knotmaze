import json, sys, collections, statistics
J = json.load(open(sys.argv[1])); R = J['rooms']; rows = {R[i]: R[i:i+11] for i in range(0, len(R), 11)}
C = J['corn']; corn = {(C[i], C[i+1], C[i+2]): C[i+3] for i in range(0, len(C), 4)}
X = {c['i']: c for c in J['crossings']}
tab = collections.defaultdict(list)
for i, x in X.items():
    r = rows.get(i)
    if not r: continue
    for b in x['borders']:
        d, l = b['dir'], b['lat']
        need = r[5] if d < 0 else r[6]; jr = r[1] if d < 0 else r[2]
        ca = corn[(i, d, l)]
        tab[b['path']].append((ca, need, jr, b.get('keepM')))
for p, L in tab.items():
    ok = sum(1 for ca, nd, jr, k in L if ca >= nd)
    print(p, len(L), 'corner>=need', ok, 'corner med', round(statistics.median([q[0] for q in L]), 3), 'need med', round(statistics.median([q[1] for q in L]), 3), 'corner<0.3', sum(1 for q in L if q[0] < 0.3))
