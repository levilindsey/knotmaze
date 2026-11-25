# K1588 s3: does the rule change each place on master as it did on the source branch? Per box of this build's diff
# (fdiff.py's <tag>_<maze>.json, master -> this build), the changed pixels here (A: |m0 - j5| > 2) against the source
# branch's own change (B: |s4g - j4| > 2, stage 4 -> the rule), both in the box: nA, nB, both, and how many of A end at
# the source's value (|j5 - j4| <= 2). Jaccard = both / (nA + nB - both). Prints one line per box, lowest Jaccard first.
#   python srcmatch.py <m0Root> <j5Root> <s4gRoot> <j4Root> <diffDir> <tag> <out.txt>
import sys, json, os
import numpy as np
from PIL import Image
m0r, j5r, s4r, j4r, dd, tag, outp = sys.argv[1:8]
MZ = [f'A_{c}' for c in '3456789abcd'] + [f'D_{c}' for c in '123456789a']
L = lambda r, m: np.asarray(Image.open(os.path.join(r, m, 'gf_b2.png')).convert('L'), dtype=np.int16)
rows = []; tot = dict(nA=0, nB=0, both=0, end=0)
for m in MZ:
    a0, a1, b0, b1 = L(m0r, m), L(j5r, m), L(s4r, m), L(j4r, m)
    A = np.abs(a1 - a0) > 2; B = np.abs(b1 - b0) > 2; E = np.abs(a1 - b1) <= 2
    for bx in json.load(open(os.path.join(dd, f'{tag}_{m}.json')))['boxes']:
        x0, y0 = bx['x'] - bx['w'] // 2, bx['y'] - bx['h'] // 2
        sl = (slice(y0, y0 + bx['h']), slice(x0, x0 + bx['w']))
        nA = int(A[sl].sum()); nB = int(B[sl].sum()); both = int((A[sl] & B[sl]).sum()); end = int((A[sl] & E[sl]).sum())
        jac = both / max(1, nA + nB - both)
        base = int((np.abs(a0[sl] - b0[sl]) > 2).sum())
        rows.append((jac, m, bx, nA, nB, both, end, base))
        tot['nA'] += nA; tot['nB'] += nB; tot['both'] += both; tot['end'] += end
rows.sort(key=lambda r: (r[0], -r[3]))
with open(outp, 'w') as f:
    f.write(f"# all: here {tot['nA']} px, source {tot['nB']} px, both {tot['both']}, here ending at the source's value {tot['end']}\n")
    f.write('# jac maze cross site centre wxh | here source both endsAtSource | master-vs-stage4 px in box\n')
    for jac, m, bx, nA, nB, both, end, base in rows:
        f.write(f"{jac:.2f} {m} x{bx['cross']} {bx['site']} {bx['x']},{bx['y']} {bx['w']}x{bx['h']} | {nA} {nB} {both} {end} | {base}\n")
n = len(rows); hi = sum(1 for r in rows if r[0] >= 0.8); lo = sum(1 for r in rows if r[0] < 0.5)
print(f"boxes {n}: jaccard >= 0.8: {hi}, < 0.5: {lo}; totals {tot}")
