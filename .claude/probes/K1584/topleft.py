# K1584 (27Z8) Done 4: the 20 no-gap sides nearest A_3's top-left quarter.
#   python topleft.py <todayDir> <histDirEarliest> [<histDir> ...]
# Dirs hold crossings.tsv (census.py) in build order, earliest first. A side
# is (crossing id, dir); every build shares the physics state, so ids match
# (centres checked within 4 device px). First lost = first listed build
# whose row reads no_gap=1; a side no-gap already at the earliest build
# reads "at/before <earliest>"; a side gapped at every history build reads
# "after <latest>". Top-left quarter: x < 1600 and y < 900 of the 3200x1800
# frame; nearest = smallest x^2 + y^2.
import os, sys

def load(d):
    out = {}
    for l in open(os.path.join(d, 'crossings.tsv')).read().splitlines()[1:]:
        if not l.strip():
            continue
        r = l.split('\t')
        out[(int(r[0]), int(r[8]))] = {'x': float(r[1]), 'y': float(r[2]), 'kind': r[7],
                                       'nogap': None if r[12] == '' else int(r[12])}
    return out

today = load(sys.argv[1])
hist_dirs = sys.argv[2:]
labels = [os.path.basename(os.path.dirname(os.path.abspath(d))) for d in hist_dirs]
hist = [load(d) for d in hist_dirs]
cands = []
for key, r in today.items():
    if r['nogap'] != 1 or not (r['x'] < 1600 and r['y'] < 900):
        continue
    first = None
    for lab, h in zip(labels, hist):
        hr = h.get(key)
        if hr is None or abs(hr['x'] - r['x']) > 4 or abs(hr['y'] - r['y']) > 4:
            first = 'unmatched across builds'; break
        if hr['nogap'] == 1:
            first = ('at/before ' + lab) if lab == labels[0] else lab
            break
    if first is None:
        first = 'after ' + labels[-1] if labels else 'today'
    cands.append((r['x']**2 + r['y']**2, r['x'], r['y'], r['kind'], key, first))
cands.sort()
for _, x, y, kind, key, first in cands[:20]:
    print('x=%.0f y=%.0f kind=%s crossing=%d dir=%+d first_lost=%s' % (x, y, kind, key[0], key[1], first))
print('# no-gap sides in quarter:', len(cands))
