# K1588 s1: sheets of changed places between two same-view captures: one tile per place, three panels
# (before | after | after with the changed pixels in red), tiles ordered by changed px, `per` tiles a sheet.
#   python sheets.py <label> <beforeDir> <afterDir> <diff.json|-> <outPrefix> [per=12] [half=32] [sc=4] [places]   (env COLS: tiles across, default 2)
# diff.json is framediff.py's (boxes: x, y, w, h, px, cross, site). `places` adds or (with diff "-") gives the
# list by hand: "name:x:y,name:x:y" in image px. A box wider than the tile is shown at a lower scale.
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
lab, bd, ad, dj, outp = sys.argv[1:6]
per = int(sys.argv[6]) if len(sys.argv) > 6 else 12
half = int(sys.argv[7]) if len(sys.argv) > 7 else 32
sc = int(sys.argv[8]) if len(sys.argv) > 8 else 4
places = sys.argv[9] if len(sys.argv) > 9 else ''
try: F = ImageFont.truetype('arial.ttf', 13)
except Exception: F = ImageFont.load_default()
load = lambda d: np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
B, A = load(bd), load(ad)
D = np.abs(A - B).max(axis=2) > 2  # any channel, as fdiff.py: a luminance test misses a border on a dark fill
lo, hi = np.percentile(B[::4, ::4], 1), np.percentile(B[::4, ::4], 99.7)
T = []
if dj != '-':
    for i, b in enumerate(json.load(open(dj))['boxes']): T.append((f"#{i + 1} x{b['cross']} {b['site']} px {b['px']} at {b['x']},{b['y']}", b['x'], b['y'], max(b['w'], b['h'])))
for p in [p for p in places.split(',') if p]:
    nm, x, y = p.split(':'); T.append((nm, int(x), int(y), 0))
P = half * sc
def panel(Q, cx, cy, h, mark=None):
    H, W = Q.shape[:2]; x0, y0 = cx - h, cy - h
    c = np.zeros((2 * h, 2 * h, 3), np.float32) + lo
    sx0, sy0, sx1, sy1 = max(x0, 0), max(y0, 0), min(x0 + 2 * h, W), min(y0 + 2 * h, H)
    if sx1 > sx0 and sy1 > sy0:
        c[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = Q[sy0:sy1, sx0:sx1]
    c = np.clip((c - lo) / (hi - lo), 0, 1) ** 0.8
    if mark is not None:
        m = np.zeros((2 * h, 2 * h), bool)
        if sx1 > sx0 and sy1 > sy0: m[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = mark[sy0:sy1, sx0:sx1]
        c[m] = (1.0, 0.1, 0.1)
    return Image.fromarray((c * 255).astype(np.uint8), 'RGB').resize((2 * P, 2 * P), Image.NEAREST)
tiles = []
for nm, cx, cy, ext in T:
    h = half
    while 2 * h < ext + 16 and h < 4 * half: h *= 2
    t = Image.new('RGB', (3 * 2 * P + 12, 2 * P + 20), (40, 0, 60)); dr = ImageDraw.Draw(t)
    dr.text((4, 3), f"{lab} {nm}  (before | after | changed){'' if h == half else f'  1/{h // half} scale'}", fill=(255, 255, 0), font=F)
    t.paste(panel(B, cx, cy, h), (0, 20)); t.paste(panel(A, cx, cy, h), (2 * P + 6, 20)); t.paste(panel(A, cx, cy, h, D), (4 * P + 12, 20))
    tiles.append(t)
cols = int(os.environ.get('COLS', '2'))
for i in range(0, len(tiles), per):
    G = tiles[i:i + per]; w, hh = G[0].size; rows = (len(G) + cols - 1) // cols
    S = Image.new('RGB', (cols * w + (cols - 1) * 8, rows * hh + (rows - 1) * 8), (20, 20, 20))
    for k, t in enumerate(G): S.paste(t, ((k % cols) * (w + 8), (k // cols) * (hh + 8)))
    o = f"{outp}_{i // per + 1}.png"; S.save(o); print(o, S.size, len(G), 'tiles')
if not tiles: print(lab, 'no places')
