# K1584 s9: floats.py's loose pieces (<= 300 px) that lie by a ball in a crossing's gap (out/measure.json): a piece whose
# ink centroid is within the ball's radius + REACH px of its centre belongs to that ball; each ball sits on the tight
# side of the wedge's line (opening < line) or the loose side.
#   python a9.py <floats.json> <line_deg> <cap names, comma separated, in floats.py's order>
import sys, json, os
here = os.path.dirname(os.path.abspath(__file__)); REACH = 10
F = json.load(open(sys.argv[1])); line = float(sys.argv[2]); names = sys.argv[3].split(',')
rows = json.load(open(os.path.join(here, 'out', 'measure.json')))
BINS = [(1, 8), (9, 40), (41, 120), (121, 300)]
cnt = {(c, s): [0] * 4 for c in range(len(names)) for s in ('tight', 'loose')}; lst = []
for p in F:
    best = None
    for r in rows:
        if r['m'] != p['m']: continue
        d = ((r['dev'][0] - p['x']) ** 2 + (r['dev'][1] - p['y']) ** 2) ** 0.5
        if d <= r['px'] + REACH and (best is None or d < best[0]): best = (d, r)
    if not best: continue
    side = 'tight' if best[1]['deg'] < line else 'loose'
    for b, (lo, hi) in enumerate(BINS):
        if lo <= p['a'] <= hi: cnt[(p['cap'], side)][b] += 1
    lst.append('%-6s %s k%-4d %5.1f deg %-5s  %3d px at (%.0f, %.0f), %.1f px from the centre' % (names[p['cap']], p['m'], best[1]['k'], best[1]['deg'], side, p['a'], p['x'], p['y'], best[0]))
for s in ('tight', 'loose'):
    print('%-5s side: ' % s + '  '.join('%s %s' % (names[c], '/'.join(str(v) for v in cnt[(c, s)])) for c in range(len(names))))
print('bins', BINS, '; reach: ball radius +', REACH, 'px')
print('\n'.join(sorted(lst, key=lambda l: (l.split()[1], l.split()[2], l.split()[0]))))
