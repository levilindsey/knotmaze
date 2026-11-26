# K1584 s3: an annotated crop of one capture: each crossing labelled with its index and its four borders' paths
# (gapcheck json, order dir-1 lat+1, dir-1 lat-1, dir+1 lat+1, dir+1 lat-1).
#   python ann.py <captureDir> <gapcheck.json> <out.png> x y w h scale
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
d, gj, out = sys.argv[1:4]; x, y, w, h, sc = map(int, sys.argv[4:9])
q = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
L = (299 * q[:, :, 0] + 587 * q[:, :, 1] + 114 * q[:, :, 2]) / 1000
lo, hi = np.percentile(L, 1), np.percentile(L, 99.5)
c = L[y:y + h, x:x + w]
im = Image.fromarray((np.clip((c - lo) / (hi - lo), 0, 1) * 255).astype(np.uint8), 'L').resize((w * sc, h * sc), Image.NEAREST).convert('RGB')
dr = ImageDraw.Draw(im)
try: F = ImageFont.truetype('arial.ttf', 14)
except Exception: F = ImageFont.load_default()
G = json.load(open(gj))['crossings']
for r in G:
    px, py = r['dev']
    if not (x <= px < x + w and y <= py < y + h): continue
    lab = f"x{r['i']} " + ''.join(b['path'][0] for b in r['borders'])
    X, Y = (px - x) * sc, (py - y) * sc
    dr.text((X + 6, Y - 18), lab, fill=(255, 60, 60), font=F)
im.save(out); print(out, im.size)
