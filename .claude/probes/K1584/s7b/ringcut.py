# K1584 s7b: cut pixels (raw luminance up by more than 3, sheet7's diff) within R device px of each of K1595's 50
# corner places, today -> s5, today -> s6 and (once s7a exists) today -> s7. Today cuts no pixel there (K1595 Q3), so
# a count there is the stem fault's candidate; the sheets say whether it is on the pair corner's fillet.
#   python ringcut.py [R=9] [only=A_4:216,...]
import json, os, sys
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(H, '..')
DIRS = {'today': r's1\out\before', 's5': r's5\out\s5d', 's6': r's6\out\s6a', 's7': r's7\out\s7a'}
K95 = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1595-diag\.claude\probes\K1595\out\scan\ruled_places.json'
R = float(sys.argv[1]) if len(sys.argv) > 1 else 9
only = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
_i = {}
def lum(tag, m):
    p = os.path.join(K, DIRS[tag], m, 'gf_b2.png')
    if not os.path.exists(p): return None
    if p not in _i:
        x = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
        _i[p] = (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
    return _i[p]
yy, xx = np.mgrid[-int(R):int(R) + 1, -int(R):int(R) + 1]; disk = (xx * xx + yy * yy) <= R * R
for mz, k, n5, n4, X, Y, u, o in json.load(open(K95)):
    if only and f'{mz}:{k}' not in only: continue
    X, Y = int(round(X)), int(round(Y)); r = int(R)
    A = lum('today', mz)
    row = []
    for t in ('s5', 's6', 's7'):
        B = lum(t, mz)
        if B is None: row.append(f'{t} -'); continue
        d = (B - A)[Y - r:Y + r + 1, X - r:X + r + 1]
        row.append(f'{t} +{int(((d > 3) & disk).sum()):3d} -{int(((d < -3) & disk).sum()):3d}')
    print(f'{mz} k{k:<4d} c{u}<c{o} at {X},{Y}  K1595 {n5:3d}  ' + '  '.join(row))
