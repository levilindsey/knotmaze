import json, sys, collections
J = json.load(open(sys.argv[1])); R = J['rooms']; n = 11
rows = [R[i:i+n] for i in range(0, len(R), n)]
X = {c['i']: c for c in J['crossings']}
# per side: room, memArc, need, scale ms fs, and the gapcheck path(s) of that side's two borders
st = collections.Counter(); ex = []
for r in rows:
    i, jN, jP, mN, mP, nN, nP, msN, fsN, msP, fsP = r
    for dir, j, m, nd, ms, fs in ((-1, jN, mN, nN, msN, fsN), (1, jP, mP, nP, msP, fsP)):
        paths = [b['path'] for b in X[i]['borders'] if b['dir'] == dir]
        cls = 'full' if (ms >= 1 and fs >= 1) else 'scaled'
        memOK = 'mem>=need' if m >= nd else ('mem<need' if m < 9 else 'nomem')
        st[(cls, memOK)] += 1
        if cls == 'scaled': ex.append((i, dir, round(j, 3), round(m, 3), round(nd, 3), round(ms, 2), round(fs, 2), paths))
for k, v in sorted(st.items()): print(k, v)
import statistics
print('scaled sides: need med', statistics.median([e[4] for e in ex]), 'mem med', statistics.median([e[3] for e in ex if e[3] < 9]))
for e in ex[:40]: print(e)
