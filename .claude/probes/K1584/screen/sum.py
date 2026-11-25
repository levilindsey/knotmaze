import json, glob, os, sys, collections
sp = sys.argv[1]
T = [collections.Counter() for _ in range(3)]; tr_a = collections.Counter(); tr_b = collections.Counter(); n = 0
closed = []; hooks = {('A_9', 3), ('A_c', 258), ('A_5', 158), ('A_7', 58), ('A_6', 48), ('A_4', 219), ('A_d', 292), ('A_c', 202)}
for f in sorted(glob.glob(sp + r'\[AD]_?.json')):
    m = os.path.basename(f)[:-5]
    for s in json.load(open(f))['sides']:
        v = [x['v'] for x in s['scr']]; n += 1
        for k in range(3): T[k][v[k]] += 1
        tr_a[(v[0], v[1])] += 1; tr_b[(v[1], v[2])] += 1
        if v[2] == 'closed': closed.append((m, s['i'], s['dir'], s['lat'], s['model'], s['scr'][2]['gap'], s['scr'][2]['far'], s['self']))
        if (m, s['i']) in hooks: print('hook', m, 'x%d' % s['i'], s['dir'], s['lat'], s['model'], [(x['v'], x['gap'], x['far']) for x in s['scr']])
print('sides', n)
for k, l in enumerate(['stage 4', 'carve', 'stage 5']): print(l, dict(sorted(T[k].items())))
print('stage 4 -> carve', {k: v for k, v in sorted(tr_a.items()) if k[0] != k[1]})
print('carve -> stage 5', {k: v for k, v in sorted(tr_b.items()) if k[0] != k[1]})
j = [c for c in closed if c[6] is not None and c[6] < 0.3]; o = [c for c in closed if not (c[6] is not None and c[6] < 0.3)]
print('closed in stage 5:', len(closed), '| border ends within 0.2 (junction beside):', len(j), '| border runs on:', len(o), '| self crossings:', sum(1 for c in closed if c[7]))
print('model path of the closed:', collections.Counter(c[4] for c in closed))
print('runs on:', ' '.join('%s:x%d:%+d%+d(%s %.2f)' % (c[0], c[1], c[2], c[3], c[4], c[5]) for c in o))
json.dump(closed, open(sp + r'\closed_s5d.json', 'w'))
