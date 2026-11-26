# K1584 s7: summary of pxdiff.ts's outputs (out/px/<maze>.json): mirror-changed places per rule, merged by crossing
# (and by overlapping bbox), with the named places checked.   python pxsum.py [-v] [-o places.json]
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'px')
STEMS = [('A_a', 1600, 1619), ('A_c', 1585, 1359), ('A_6', 1362, 1615), ('A_5', 1270, 747), ('A_b', 1370, 554),
         ('A_6', 1269, 326), ('A_d', 2199, 952)]
WRONG = [('A_b', 75), ('A_8', 65), ('A_5', 277)]
RIGHT = [('A_3', 49), ('D_9', 264), ('A_6', 119), ('A_3', 102), ('A_c', 75), ('A_3', 192), ('A_7', 81), ('A_d', 241),
         ('A_c', 102), ('A_7', 158), ('A_4', 343), ('A_4', 5)]
ALL = []
for f in sorted(os.listdir(D)):
    if not f.endswith('.json'): continue
    m = f[:-5]; J = json.load(open(os.path.join(D, f)))
    for p in J['places']:
        if p['n'] <= 0: continue
        b = p['bbox']
        ALL.append({'m': m, 'rule': p['rule'], 'x': p['x']['i'] if p['x'] else None, 'o': p['x']['o'] if p['x'] else None,
                    'off': p['x']['off'] if p['x'] else None, 'c': p['c'], 'n': p['n'], 'more': p['inkMore'],
                    'less': p['inkLess'], 'bbox': b, 'ctr': [(b[0] + b[2]) // 2, (b[1] + b[3]) // 2]})
# merge places of one maze and rule whose bboxes overlap (a crossing's two sides, split runs)
def ov(a, b, pad=4): return not (a[2] + pad < b[0] or b[2] + pad < a[0] or a[3] + pad < b[1] or b[3] + pad < a[1])
G = []
for p in ALL:
    for g in G:
        if g['m'] == p['m'] and g['rule'] == p['rule'] and ov(g['bbox'], p['bbox']):
            g['bbox'] = [min(g['bbox'][0], p['bbox'][0]), min(g['bbox'][1], p['bbox'][1]), max(g['bbox'][2], p['bbox'][2]), max(g['bbox'][3], p['bbox'][3])]
            g['n'] += p['n']; g['more'] += p['more']; g['less'] += p['less']; g['xs'].add(p['x']); g['cs'].add(p['c'])
            break
    else:
        G.append({**p, 'xs': {p['x']}, 'cs': {p['c']}})
for g in G:
    b = g['bbox']; g['ctr'] = [(b[0] + b[2]) // 2, (b[1] + b[3]) // 2]; g['xs'] = sorted(x for x in g['xs'] if x is not None); g['cs'] = sorted(g['cs'])
for r in ('K', 'C'):
    L = [g for g in G if g['rule'] == r]
    print(f'rule {r}: {len(L)} places, {sum(g["n"] for g in L)} px (ink restored {sum(g["more"] for g in L)}, removed {sum(g["less"] for g in L)}), mazes {len({g["m"] for g in L})}')
    if '-v' in sys.argv:
        for g in L: print('   ', g['m'], 'x' + ','.join(map(str, g['xs'])), 'c' + ','.join(map(str, g['cs'])), 'n', g['n'], '+', g['more'], '-', g['less'], 'at', g['ctr'], 'bbox', g['bbox'])
def near(m, X, Y, R=40): return [g for g in G if g['m'] == m and g['bbox'][0] - R <= X <= g['bbox'][2] + R and g['bbox'][1] - R <= Y <= g['bbox'][3] + R]
print('stems:')
for m, X, Y in STEMS: print('  ', m, X, Y, [(g['rule'], g['xs'], g['n'], g['more'], g['less'], g['ctr']) for g in near(m, X, Y)])
for nm, L in (('wrong', WRONG), ('right', RIGHT)):
    print(nm + ':')
    for m, x in L: print('  ', m, 'x%d' % x, [(g['rule'], g['xs'], g['n'], g['more'], g['less'], g['ctr']) for g in G if g['m'] == m and x in g['xs']])
if '-o' in sys.argv:
    json.dump(G, open(sys.argv[sys.argv.index('-o') + 1], 'w'))
