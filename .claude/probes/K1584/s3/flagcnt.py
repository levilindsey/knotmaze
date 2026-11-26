import json, sys, collections
J = json.load(open(sys.argv[1])); R = J['rooms']; rows = {R[i]: R[i:i+11] for i in range(0, len(R), 11)}
C = J['corn']; corn = {(C[i], C[i+1], C[i+2]): C[i+3] for i in range(0, len(C), 4)}
cnt = collections.Counter()
for x in J['crossings']:
    r = rows[x['i']]
    for b in x['borders']:
        d = b['dir']; need = r[5] if d < 0 else r[6]
        other = corn[(x['i'], d, -b['lat'])]; own = corn[(x['i'], d, b['lat'])]
        sideMin = min(own, other)
        cnt[(b['path'], 'memO%d' % b['memO'], 'own>=need' if own >= need else 'own<need', 'side>=need' if sideMin >= need else 'side<need')] += 1
for k, v in sorted(cnt.items()): print(k, v)
