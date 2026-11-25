# K1588 combined: item lists for sheet.py from the combined counts.
import json, sys, collections
sp = sys.argv[1]; d = sp + '\\comb'
ch = json.load(open(d + r'\changes.json'))
# 1. changed sides, by transition
by = collections.defaultdict(list)
for m, i, dr, lat, a, b in ch: by[a + '>' + b].append((m, i, dr, lat))
for k, v in by.items(): print(k, len(v), ' '.join('%s x%s' % (m, i) for m, i, _, _ in v))
lines = ['%s|%s\\%s.json|%s|%s|%s' % (m, d, m, i, dr, lat) for m, i, dr, lat, a, b in sorted(ch, key=lambda c: (c[4] + c[5], c[0], c[1]))]
open(d + r'\it_sides.txt', 'w').write('\n'.join(lines))
# 2. places where the rule adds ink on the gap step
cg = json.load(open(d + r'\chg.json'))
print('places', len(cg), 'with added >= 4 px', sum(1 for r in cg if r['added'] >= 4), 'added >= 10', sum(1 for r in cg if r['added'] >= 10))
top = sorted(cg, key=lambda r: -r['added'])[:36]
open(d + r'\it_add.txt', 'w').write('\n'.join('%s|@|%.1f|%.1f|%s x%s +%d' % (r['m'], r['x'], r['y'], r['m'], r['xi'], r['added']) for r in top))
big = sorted(cg, key=lambda r: -r['px'])[:36]
open(d + r'\it_big.txt', 'w').write('\n'.join('%s|@|%.1f|%.1f|%s x%s %dpx' % (r['m'], r['x'], r['y'], r['m'], r['xi'], r['px']) for r in big))
print('largest px', [r['px'] for r in big[:12]], 'largest added', [r['added'] for r in top[:12]])
# 3. far places today -> combined
fr = json.load(open(d + r'\far_tc.json'))
ad = [r for r in fr if r['kind'] == 'added']; print('far added', [(r['m'], r['x'], r['y'], r['px']) for r in ad])
open(d + r'\it_faradd.txt', 'w').write('\n'.join('%s|@|%.1f|%.1f|%s far +%d' % (r['m'], r['x'], r['y'], r['m'], r['px']) for r in ad))
old = json.load(open(sp + r'\far_tn.json'))
def near(r, L): return any(o['m'] == r['m'] and abs(o['x'] - r['x']) < 14 and abs(o['y'] - r['y']) < 14 for o in L)
new = [r for r in fr if not near(r, old)]; gone = [o for o in old if not near(o, fr)]
print('far places: today->now', len(old), 'today->combined', len(fr), 'new with the rule', len(new), 'gone with the rule', len(gone))
print(' new', [(r['m'], r['x'], r['y'], r['px'], r['kind']) for r in new]); print(' gone', [(r['m'], r['x'], r['y'], r['px'], r['kind']) for r in gone])
open(d + r'\it_farnew.txt', 'w').write('\n'.join('%s|@|%.1f|%.1f|%s far %s %d' % (r['m'], r['x'], r['y'], r['m'], r['kind'], r['px']) for r in new + gone))
