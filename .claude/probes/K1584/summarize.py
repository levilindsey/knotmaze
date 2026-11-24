# K1584 (27Z8): tally crossings.tsv files written by census.py.
#   python summarize.py <dir> [<dir> ...]   each dir holds crossings.tsv
# Prints per dir: crossings, sides, no-gap sides, and by kind.
import os, sys
from collections import defaultdict

for d in sys.argv[1:]:
    p = os.path.join(d, 'crossings.tsv')
    if not os.path.exists(p):
        print('MISSING', p); continue
    rows = [l.split('\t') for l in open(p).read().splitlines()[1:] if l.strip()]
    cross = len({r[0] for r in rows})
    sides = len(rows); nogap = sum(int(r[12]) for r in rows if r[12] != '')
    by = defaultdict(lambda: [0, 0])
    for r in rows:
        if r[12] == '':
            continue
        by[r[7]][0] += 1; by[r[7]][1] += int(r[12])
    parts = ' '.join('%s %d/%d' % (k, by[k][1], by[k][0]) for k in sorted(by))
    print('%s crossings=%d sides=%d nogap=%d (%.1f%%) | %s' % (d, cross, sides, nogap, 100.0 * nogap / max(sides, 1), parts))
