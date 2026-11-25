# K1588 s3: which changed places are not a wedge, blob or barb removed? Per box of fdiff.py's diff (master -> this
# build), the changed px (luminance |after - before| > 2): how many, their mean |delta| (an ink -> paper removal moves
# 10-20 levels, a soft-edge shift a few), how many are interior (all 8 neighbours changed: a removed blob has some, a
# 1 px line along an edge none) and the signed mean (+ = lighter = ink removed). Lists the boxes with >= MINPX px and
# mean |delta| under SOFT or no interior px, largest first: the edge shifts and fades to view.
#   python edgeshift.py <beforeRoot> <afterRoot> <diffDir> <tag> <out.txt> [minpx=10] [soft=8]
import sys, json, os
import numpy as np
from PIL import Image
br, ar, dd, tag, outp = sys.argv[1:6]
MINPX = int(sys.argv[6]) if len(sys.argv) > 6 else 10; SOFT = float(sys.argv[7]) if len(sys.argv) > 7 else 8
MZ = [f'A_{c}' for c in '3456789abcd'] + [f'D_{c}' for c in '123456789a']
L = lambda r, m: np.asarray(Image.open(os.path.join(r, m, 'gf_b2.png')).convert('L'), dtype=np.int16)
rows = []
for m in MZ:
    a0, a1 = L(br, m), L(ar, m); dl = a1 - a0; C = np.abs(dl) > 2
    P = np.pad(C, 1); inner = C.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            inner &= P[1 + dy:1 + dy + C.shape[0], 1 + dx:1 + dx + C.shape[1]]
    for bx in json.load(open(os.path.join(dd, f'{tag}_{m}.json')))['boxes']:
        x0, y0 = bx['x'] - bx['w'] // 2, bx['y'] - bx['h'] // 2
        sl = (slice(y0, y0 + bx['h']), slice(x0, x0 + bx['w']))
        c = C[sl]; n = int(c.sum())
        if n < MINPX: continue
        d = dl[sl][c]; mabs = float(np.abs(d).mean()); sgn = float(d.mean()); ni = int(inner[sl].sum())
        if mabs < SOFT or ni == 0: rows.append((n, m, bx, mabs, sgn, ni))
rows.sort(key=lambda r: -r[0])
with open(outp, 'w') as f:
    f.write(f'# boxes with >= {MINPX} changed px and mean |delta| < {SOFT} or no interior px: {len(rows)}\n')
    f.write('# px maze cross site centre | mean|d| signed interior\n')
    for n, m, bx, mabs, sgn, ni in rows:
        f.write(f"{n} {m} x{bx['cross']} {bx['site']} {bx['x']},{bx['y']} | {mabs:.1f} {sgn:+.1f} {ni}\n")
print(f'{len(rows)} boxes -> {outp}')
