# K1584 s3: a sheet of crossing SIDES of one path class (gapcheck json): each tile a w x w device px crop at scale,
# centred on the side's exit point, a red tick at the border's exit, label = crossing, dir, lat, path, e_ink.
#   python sides.py <captureDir> <gj_ink.json> <out.png> <path|all> [n=16] [w=40] [sc=6] [cols=4] [list=i:dir:lat,...]
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
d, gj, out, cls = sys.argv[1:5]
n = int(sys.argv[5]) if len(sys.argv) > 5 else 16; w = int(sys.argv[6]) if len(sys.argv) > 6 else 40
sc = int(sys.argv[7]) if len(sys.argv) > 7 else 6; cols = int(sys.argv[8]) if len(sys.argv) > 8 else 4
lst = sys.argv[9].split(',') if len(sys.argv) > 9 else None
q = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
L = (299 * q[:, :, 0] + 587 * q[:, :, 1] + 114 * q[:, :, 2]) / 1000
lo, hi = np.percentile(L, 1), np.percentile(L, 99.5)
G = json.load(open(gj))
S = []
for r in G['crossings']:
    for b in r['borders']:
        key = f"{r['i']}:{b['dir']}:{b['lat']}"
        if lst is not None:
            if key in lst: S.append((r, b))
        elif cls == 'all' or b['path'] == cls: S.append((r, b))
if lst is None and len(S) > n: S = [S[int(j * len(S) / n)] for j in range(n)]
try: F = ImageFont.truetype('arial.ttf', 13)
except Exception: F = ImageFont.load_default()
tw, th = w * sc, w * sc + 16
rows = -(-len(S) // cols)
im = Image.new('RGB', (cols * (tw + 6), rows * (th + 6)), (40, 0, 60)); dr = ImageDraw.Draw(im)
for j, (r, b) in enumerate(S):
    p = b['pts']
    if not p: continue
    ex, ey = p[0], p[1]
    x0, y0 = int(ex - w / 2), int(ey - w / 2)
    c = L[max(0, y0):y0 + w, max(0, x0):x0 + w]
    t = Image.fromarray((np.clip((c - lo) / (hi - lo), 0, 1) * 255).astype(np.uint8), 'L').resize((c.shape[1] * sc, c.shape[0] * sc), Image.NEAREST).convert('RGB')
    ox, oy = (j % cols) * (tw + 6), (j // cols) * (th + 6)
    im.paste(t, (ox, oy + 16))
    X, Y = ox + (ex - x0) * sc, oy + 16 + (ey - y0) * sc
    dr.ellipse((X - 3, Y - 3, X + 3, Y + 3), outline=(255, 0, 0))
    dr.text((ox + 2, oy + 1), f"x{r['i']} {b['dir']:+d}{b['lat']:+d} {b['path']} ink {b.get('eInk', 0):.2f}", fill=(255, 255, 0), font=F)
im.save(out); print(out, im.size, len(S))
