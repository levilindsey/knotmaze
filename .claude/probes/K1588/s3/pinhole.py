# K1588 s1: pinholes the rule opened: in each changed box of a frame diff, a small island of non-ink pixels in the
# AFTER capture that ink encloses on every side (8-connected island, 4-connected wall), holds at least one changed
# pixel and was not the same island in the BEFORE capture. Ink = luminance under INK: gf's border strokes read 20
# and the darkest fill 27 to 35, so the default is 24.5 (at 55 a dark fill counts as ink and the scan finds nothing).
#   python pinhole.py <beforeRoot> <afterRoot> <diffDir> <tag> [maxPx=40] [ink=24.5]
# roots hold <maze>/gf_b2.png; diffDir holds <tag>_<maze>.json (fdiff.py's). Enclosed islands only: a notch open
# to the paper is not found. An island that only grew (was ink 1 of 28) is an old sliver, not a new pinhole.
import sys, json, os, glob
import numpy as np
from PIL import Image
br, ar, dd, tag = sys.argv[1:5]
maxpx = int(sys.argv[5]) if len(sys.argv) > 5 else 40
INK = float(sys.argv[6]) if len(sys.argv) > 6 else 24.5
lum = lambda x: (299 * x[..., 0] + 587 * x[..., 1] + 114 * x[..., 2]) / 1000
def islands(open_, pad):
    # 8-connected components of open_ that do not touch the window edge
    h, w = open_.shape; seen = np.zeros_like(open_, bool); out = []
    for y0 in range(h):
        for x0 in range(w):
            if not open_[y0, x0] or seen[y0, x0]: continue
            st = [(y0, x0)]; seen[y0, x0] = True; comp = []; edge = False
            while st:
                y, x = st.pop(); comp.append((y, x))
                if y == 0 or x == 0 or y == h - 1 or x == w - 1: edge = True
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and open_[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
            if not edge: out.append(comp)
    return out
tot = 0
for p in sorted(glob.glob(os.path.join(dd, f'{tag}_*.json'))):
    m = os.path.basename(p)[len(tag) + 1:-5]
    B = np.asarray(Image.open(os.path.join(br, m, 'gf_b2.png')).convert('RGB')).astype(np.float32)
    A = np.asarray(Image.open(os.path.join(ar, m, 'gf_b2.png')).convert('RGB')).astype(np.float32)
    ch = np.abs(A - B).max(axis=2) > 2; LA, LB = lum(A), lum(B); H, W = LA.shape
    n = 0
    for b in json.load(open(p))['boxes']:
        # a box's x, y are its CENTRE (fdiff.py line 70), w and h its full size
        pad = 14; x0, y0 = max(0, b['x'] - b['w'] // 2 - pad), max(0, b['y'] - b['h'] // 2 - pad); x1, y1 = min(W, b['x'] + b['w'] // 2 + pad), min(H, b['y'] + b['h'] // 2 + pad)
        oa = LA[y0:y1, x0:x1] >= INK; ob = LB[y0:y1, x0:x1] >= INK; c = ch[y0:y1, x0:x1]
        bis = {frozenset(k) for k in islands(ob, pad)}
        for comp in islands(oa, pad):
            if len(comp) > maxpx or not any(c[y, x] for y, x in comp): continue
            if frozenset(comp) in bis: continue
            ys = [y for y, _ in comp]; xs = [x for _, x in comp]; wasInk = sum(1 for y, x in comp if not ob[y, x])
            mx = max(float(LA[y0 + y, x0 + x]) for y, x in comp)
            print(f"{m} {b.get('cross','')} {b.get('site','')} box {b['px']} px: island {len(comp)} px at {x0 + min(xs)},{y0 + min(ys)}..{x0 + max(xs)},{y0 + max(ys)}  was ink {wasInk}  brightest lum {mx:.0f}")
            n += 1
    tot += n
    print(f'# {m}: {n}')
print('# all:', tot)
