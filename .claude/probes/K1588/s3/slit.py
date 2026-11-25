# K1588 s1: slits the rule cut: a pixel that was ink in the BEFORE capture and is not in the AFTER one, with ink
# on two opposite sides of it in the AFTER capture (left and right, up and down, or along a diagonal), the gap
# between those two inks at most 2 px. A trim at a stroke's end or edge has paper on one side and is not listed;
# a slit through ink, a pinhole and a sliver between two close strokes that grew are. Ink = luminance under INK
# (gf's border strokes read 20, the darkest fill 27 to 35). The plain test is NOISY: it also lists the soft edge
# pixel in the crook where a removed stub left a border (151 boxes on the 21 mazes, the six clean named places
# among them). A HARD find ('!') reads 27 or more between two pixels of 21.5 or less: view those.
#   python slit.py <beforeRoot> <afterRoot> <diffDir> <tag> [ink=24.5]
# roots hold <maze>/gf_b2.png; diffDir holds <tag>_<maze>.json (fdiff.py's). One line per box with a find.
import sys, json, os, glob
import numpy as np
from PIL import Image
br, ar, dd, tag = sys.argv[1:5]
INK = float(sys.argv[5]) if len(sys.argv) > 5 else 24.5
lum = lambda x: (299 * x[..., 0] + 587 * x[..., 1] + 114 * x[..., 2]) / 1000
AX = ((1, 0), (0, 1), (1, 1), (1, -1))
tot = 0; nb = 0; toth = 0
for p in sorted(glob.glob(os.path.join(dd, f'{tag}_*.json'))):
    m = os.path.basename(p)[len(tag) + 1:-5]
    B = np.asarray(Image.open(os.path.join(br, m, 'gf_b2.png')).convert('RGB')).astype(np.float32)
    A = np.asarray(Image.open(os.path.join(ar, m, 'gf_b2.png')).convert('RGB')).astype(np.float32)
    ch = np.abs(A - B).max(axis=2) > 2; LA = lum(A); ia, ib = LA < INK, lum(B) < INK; H, W = ia.shape
    n = 0
    for b in json.load(open(p))['boxes']:
        hits = []  # a box's x, y are its CENTRE (fdiff.py line 70), w and h its full size
        for y in range(max(2, b['y'] - b['h'] // 2), min(H - 2, b['y'] + b['h'] // 2)):
            for x in range(max(2, b['x'] - b['w'] // 2), min(W - 2, b['x'] + b['w'] // 2)):
                if not ch[y, x] or ia[y, x] or not ib[y, x]: continue
                hit = False; hard = False
                for dx, dy in AX:
                    for k, q in ((1, 1), (1, 2), (2, 1)):
                        if ia[y + k * dy, x + k * dx] and ia[y - q * dy, x - q * dx]: hit = True
                    # hard: the pixel reads as fill or paper (not a stroke's soft edge) between two SOLID ink pixels
                    if LA[y, x] >= 27 and LA[y + dy, x + dx] <= 21.5 and LA[y - dy, x - dx] <= 21.5: hard = True
                if hit: hits.append((x, y, hard))
        if hits:
            n += len(hits); nb += 1; nh = sum(1 for h in hits if h[2]); toth += nh
            print(f"{m} x{b.get('cross','')} {b.get('site','')} box {b['px']} px centre {b['x']},{b['y']} {b['w']}x{b['h']}: {len(hits)} slit px, {nh} hard: " + ' '.join(f"{x},{y}{'!' if hd else ''}" for x, y, hd in hits[:8]))
    tot += n
    print(f'# {m}: {n}')
print('# all:', tot, 'px in', nb, 'boxes;', toth, 'hard (the pixel reads 27 or more between two pixels of 21.5 or less)')
