# K1588: sheet items (maze|@|x|y|label) for named changed places, from fdiff's per-maze json: the largest box at that crossing.
import json, sys
k = sys.argv[1]
for w in sys.argv[2:]:
    m, c = w.split(':'); c = int(c)
    bs = [b for b in json.load(open(k + r'\diff\j3_%s.json' % m))['boxes'] if b['cross'] == c]
    if not bs: print('MISSING', w, file=sys.stderr); continue
    b = max(bs, key=lambda b: b['px'])
    print('%s|@|%.1f|%.1f|%s x%d' % (m, b['x'], b['y'], m, c))
