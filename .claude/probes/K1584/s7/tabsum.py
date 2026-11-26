# K1584 s7: summary of tabdiff.ts's outputs (out/tab/<maze>.json): distinct crossings per rule per maze, and whether
# the named loop crossings (Levi's fifteen, A_3 x100) changed.   python tabsum.py [-v]
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'tab')
NAMED = {'wrong': [('A_b', 75), ('A_8', 65), ('A_5', 277)],
         'right': [('A_3', 49), ('D_9', 264), ('A_6', 119), ('A_3', 102), ('A_c', 75), ('A_3', 192), ('A_7', 81), ('A_d', 241),
                   ('A_c', 102), ('A_7', 158), ('A_4', 343), ('A_4', 5)],
         'K1586': [('A_3', 100)]}
tot = {'K': 0, 'C': 0}; mz = {'K': 0, 'C': 0}; byx = {}
for f in sorted(os.listdir(D)):
    if not f.endswith('.json'): continue
    m = f[:-5]; J = json.load(open(os.path.join(D, f)))
    for r in ('K', 'C'):
        xs = sorted({p['x']['i'] for p in J['places'] if p['rule'] == r and p['x']})
        nx = sum(1 for p in J['places'] if p['rule'] == r and not p['x'])
        tot[r] += len(xs); mz[r] += 1 if xs else 0
        for x in xs: byx.setdefault((m, x), set()).add(r)
        print(f'{m} {r}: {len(xs)} crossings {xs}' + (f' (+{nx} runs with no crossing)' if nx else ''))
        if '-v' in sys.argv:
            for p in J['places']:
                if p['rule'] == r: print('   ', p)
print('total crossings', tot, 'mazes', mz)
for k, L in NAMED.items():
    print(k, [(m, x, ''.join(sorted(byx.get((m, x), set()))) or '-') for m, x in L])
