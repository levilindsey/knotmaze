import json, sys, collections
sp = sys.argv[1]
R = json.load(open(sp + r'\floats.json'))
now = [r for r in R if r['cap'] == 3]
mid = [r for r in now if 9 <= r['a'] <= 120]
spk = [r for r in now if r['a'] <= 8 and r['other'][0] == 0]
def kind(r):
    t, s4 = r['other'][0], r['other'][1]
    if 0 < t <= 2 * r['a'] + 8: return 'T'       # a small piece today too
    if 0 < s4 <= 2 * r['a'] + 8: return 'S4'     # cut loose by the last step or before
    return 'S5'
c = collections.Counter(kind(r) for r in mid); print('9-120 px now', len(mid), dict(c))
c2 = collections.Counter(kind(r) for r in spk); print('specks not inked today', len(spk), dict(c2))
print('by maze', dict(collections.Counter(r['m'] for r in mid if kind(r) != 'T')))
items = sorted(mid + spk, key=lambda r: (kind(r), r['m'], r['y']))
rows = ['%s|@|%.1f|%.1f|%s a%d %s' % (r['m'], r['x'], r['y'], kind(r), r['a'], r['m']) for r in items]
for k in range(0, len(rows), 18): open(sp + r'\fl_%d.txt' % (k // 18), 'w').write('\n'.join(rows[k:k + 18]))
print(len(rows), 'items', (len(rows) + 17) // 18, 'sheets')
