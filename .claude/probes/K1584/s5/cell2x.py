# K1584 s5: a review cell at 2x, before | after, inverted and stretched like tiles.py, plus a diff overlay
# (ink removed red, ink added green).   python cell2x.py <maze> <cell e.g. b1> <fromTag> <toTag> [outDir=.]
# Cells: columns a..d = frame x 0..3200 in 800s, rows 1..3 = y 0..1800 in 600s (gf_b2.png pixels).
import sys, os
import numpy as np
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); K = os.path.dirname(here)
m, cell, t0, t1 = sys.argv[1:5]; od = sys.argv[5] if len(sys.argv) > 5 else here
D = {'s3b': os.path.join(K, 's3', 'out', 's3b'), 's4g': os.path.join(K, 's4', 'out', 's4g')}
def path(t): return os.path.join(D.get(t, os.path.join(here, 'out', t)), m, 'gf_b2.png')
x0 = (ord(cell[0]) - 97) * 800; y0 = (int(cell[1]) - 1) * 600
def load(t): return np.asarray(Image.open(path(t)).convert('L')).astype(np.float32)[y0:y0 + 600, x0:x0 + 800]
A, B = load(t0), load(t1)
def stretch(c):
    c = 255 - c; lo, hi = np.percentile(c, 1), np.percentile(c, 99.5)
    return np.clip((c - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
g = stretch(B) // 2; rgb = np.stack([g, g, g], -1)
rgb[(B - A) > 6] = (255, 40, 40); rgb[(B - A) < -6] = (40, 255, 40)
for name, arr in ((t0, Image.fromarray(stretch(A))), (t1, Image.fromarray(stretch(B))), ('diff', Image.fromarray(rgb, 'RGB'))):
    arr.resize((1600, 1200), Image.NEAREST).save(os.path.join(od, f'cell_{m}_{cell}_{name}_2x.png'))
Image.fromarray(rgb, 'RGB').save(os.path.join(od, f'cell_{m}_{cell}_diff_1x.png'))
print(m, cell, 'removed', int(((B - A) > 6).sum()), 'added', int(((B - A) < -6).sum()))
