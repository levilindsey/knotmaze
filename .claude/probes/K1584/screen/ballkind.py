import json, sys, collections, random
sp = sys.argv[1]
L = json.load(open(sp + r'\balls_lost.json'))
S = {}
for m in sorted(set(r['m'] for r in L)):
    S[m] = json.load(open(sp + r'\t4\%s.json' % m))['sides']
tr = collections.Counter(); nside = 0; slf = 0
for k, r in enumerate(L):
    r['k'] = k; hit = []
    for s in S[r['m']]:
        d = ((s['at'][0] - r['x']) ** 2 + (s['at'][1] - r['y']) ** 2) ** 0.5
        if d <= 14: hit.append((d, s))
    hit.sort(key=lambda h: h[0])
    r['sides'] = [dict(i=s['i'], dir=s['dir'], lat=s['lat'], d=round(d, 1), self=s['self'], v=[c['v'] for c in s['scr']]) for d, s in hit]
    for h in r['sides']:
        tr[(h['v'][0], h['v'][3])] += 1; nside += 1; slf += h['self']
print('places', len(L), 'with a side within 14 px:', sum(1 for r in L if r['sides']), 'sides', nside, 'self', slf)
print('today -> now at those sides:', sorted(tr.items(), key=lambda t: -t[1]))
json.dump(L, open(sp + r'\balls_kind.json', 'w'))
new = [r for r in L if r['lostA'] < 4]
old = [r for r in L if r['lostA'] >= 4]
random.seed(7); smp = sorted(random.sample(old[12:], 36), key=lambda r: r['k'])
def w(name, rows):
    for p in range(0, len(rows), 12):
        open(sp + r'\pg_%s%d.txt' % (name, p // 12), 'w').write('\n'.join('%s|@|%.1f|%.1f|#%d' % (r['m'], r['x'], r['y'], r['k']) for r in rows[p:p + 12]))
w('bnew', new); w('bsmp', smp)
print('new', len(new), 'sample', [r['k'] for r in smp])
