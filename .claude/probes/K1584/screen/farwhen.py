# K1584: for each far place (far.py), how many pixels of today's ink are gone within 10 px of it in each capture.
import json, sys
import numpy as np
from PIL import Image
sp, g = sys.argv[1], sys.argv[2]
caps = [('s1', r'\s1\out\after'), ('s3', r'\s3\out\s3b'), ('s4', r'\s4\out\s4g'), ('carve', r'\s5\out\s5a'), ('now', r'\s5\out\s5d')]
R = [r for r in json.load(open(sp + r'\far_tn.json')) if r['px'] >= 8]
R.sort(key=lambda r: (r['kind'] != 'added', -r['px']))
def ink(p):
    a = np.asarray(Image.open(p).convert('L')).astype(np.float32)
    return np.clip((23.5 - a) / 3.5, 0, 1)
cache = {}
def get(m, d):
    if (m, d) not in cache: cache[(m, d)] = ink(g + d + '\\' + m + r'\gf_b2.png')
    return cache[(m, d)]
first = {}
for i, r in enumerate(R):
    m = r['m']; x, y = int(round(r['x'])), int(round(r['y'])); T = get(m, r'\s1\out\before')[y - 10:y + 11, x - 10:x + 11]
    sg = 1 if r['kind'] == 'added' else -1; row = []
    for nm, d in caps:
        C = get(m, d)[y - 10:y + 11, x - 10:x + 11]; row.append(int(((C - T) * sg > 0.5).sum()))
    f = next((caps[k][0] for k, v in enumerate(row) if v >= max(4, 0.5 * row[-1])), '-')
    first[f] = first.get(f, 0) + 1
    print('f%d %s %s (%.0f,%.0f) near %.0f  s1/s3/s4/carve/now %s  first %s' % (i, m, r['kind'], r['x'], r['y'], r['near'], '/'.join(map(str, row)), f))
print(first)
