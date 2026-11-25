import json, sys
sp = sys.argv[1]
R = [r for r in json.load(open(sp + r'\far_tn.json')) if r['px'] >= 8]
R.sort(key=lambda r: (r['kind'] != 'added', -r['px']))
for k in range(0, len(R), 18):
    open(sp + r'\far_%d.txt' % (k // 18), 'w').write('\n'.join('%s|@|%.1f|%.1f|f%d %s %s %dpx' % (r['m'], r['x'], r['y'], k + j, r['m'], r['kind'], r['px']) for j, r in enumerate(R[k:k + 18])))
for i, r in enumerate(R): print('f%d' % i, r['m'], r['kind'], r['px'], 'px at (%.0f,%.0f)' % (r['x'], r['y']), 'nearest', r['near'])
