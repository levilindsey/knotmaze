# K1584 s2: one frame region of several same-view captures, one labelled panel each, brightened as the s1 sheets.
#   python variants.py <out.png> x y w h <scale> <cols> "Label=captureDir" ...
#   python variants.py --sites <out.png> <half> <scale> "j15,j22,..." "Label=captureDir" ...   (a row per named site)
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
def lum(d):
    q = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
    return (299 * q[:, :, 0] + 587 * q[:, :, 1] + 114 * q[:, :, 2]) / 1000
try: F = ImageFont.truetype('arial.ttf', 26); FS = ImageFont.truetype('arial.ttf', 15)
except Exception: F = FS = ImageFont.load_default()
a = sys.argv[1:]
sites = a[0] == '--sites'
if sites: out, half, sc, names = a[1], int(a[2]), int(a[3]), a[4].split(','); vs = a[5:]
else: out = a[0]; x, y, w, h, sc, cols = map(int, a[1:7]); vs = a[7:]
V = [(s.split('=', 1)[0], s.split('=', 1)[1]) for s in vs]; L = [lum(d) for _, d in V]
lo, hi = np.percentile(L[0], 1), np.percentile(L[0], 99.5)
def tile(M, x, y, w, h):
    c = np.zeros((h, w), np.float32) + lo; x0, y0 = max(x, 0), max(y, 0); x1, y1 = min(x + w, M.shape[1]), min(y + h, M.shape[0])
    c[y0 - y:y1 - y, x0 - x:x1 - x] = M[y0:y1, x0:x1]
    return Image.fromarray((np.clip((c - lo) / (hi - lo), 0, 1) * 255).astype(np.uint8), 'L').resize((w * sc, h * sc), Image.NEAREST)
if sites:
    S0 = {s['site']: (s['x'], s['y']) for s in json.load(open(V[0][1] + '/sites_gf.json'))['sites']}
    names = [n for n in names if n in S0]; w = 2 * half * sc
    S = Image.new('RGB', (len(V) * (w + 6) + 70, len(names) * (w + 6) + 34), (40, 0, 60)); d = ImageDraw.Draw(S)
    for j, (nm, _) in enumerate(V): d.text((70 + j * (w + 6) + 4, 6), nm, fill=(255, 255, 0), font=FS)
    for i, n in enumerate(names):
        cx, cy = S0[n]; d.text((4, 34 + i * (w + 6) + 4), n, fill=(255, 255, 0), font=FS)
        for j in range(len(V)): S.paste(tile(L[j], int(cx) - half, int(cy) - half, 2 * half, 2 * half), (70 + j * (w + 6), 34 + i * (w + 6)))
else:
    rows = -(-len(V) // cols); pw, ph = w * sc, h * sc + 40
    S = Image.new('RGB', (cols * (pw + 8), rows * (ph + 8)), (40, 0, 60)); d = ImageDraw.Draw(S)
    for j, (nm, _) in enumerate(V):
        ox, oy = (j % cols) * (pw + 8), (j // cols) * (ph + 8)
        d.text((8, oy + 5) if cols == 1 else (ox + 8, oy + 5), nm, fill=(255, 255, 0), font=F); S.paste(tile(L[j], x, y, w, h), (ox, oy + 40))
S.save(out); print(out, S.size)
