# K1584 s3: colour crops of several captures with junction/tail sites (yellow) and crossings (white x<i>) marked.
#   python ctx.py <out.png> cx cy half sc <gj.json|-> "Label=dir" ...
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; cx, cy, half, sc = map(int, sys.argv[2:6]); gj = sys.argv[6]; V = [s.split('=', 1) for s in sys.argv[7:]]
x, y, w, h = cx - half, cy - half, 2 * half, 2 * half
try: F = ImageFont.truetype('arial.ttf', 13)
except Exception: F = ImageFont.load_default()
G = json.load(open(gj))['crossings'] if gj != '-' else []
S0 = json.load(open(V[0][1] + '/sites_gf.json'))['sites']
S = Image.new('RGB', (len(V) * (w * sc + 6), h * sc + 22), (40, 0, 60)); dr = ImageDraw.Draw(S)
for j, (nm, d) in enumerate(V):
    q = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
    c = q[y:y + h, x:x + w]
    lo, hi = np.percentile(q[::4, ::4], 1), np.percentile(q[::4, ::4], 99.7)
    c = np.clip((c - lo) / (hi - lo), 0, 1) ** 0.8
    t = Image.fromarray((c * 255).astype(np.uint8), 'RGB').resize((w * sc, h * sc), Image.NEAREST)
    ox = j * (w * sc + 6); S.paste(t, (ox, 22)); dr.text((ox + 4, 3), nm, fill=(255, 255, 0), font=F)
    for r in G:
        px, py = r['dev']
        if x <= px < x + w and y <= py < y + h: dr.text((ox + (px - x) * sc - 8, 22 + (py - y) * sc - 7), f"x{r['i']}", fill=(255, 255, 255), font=F)
    for s in S0:
        if x <= s['x'] < x + w and y <= s['y'] < y + h:
            u, v = ox + (s['x'] - x) * sc, 22 + (s['y'] - y) * sc
            dr.ellipse((u - 3, v - 3, u + 3, v + 3), fill=(255, 220, 0)); dr.text((u + 4, v - 6), s['site'], fill=(255, 220, 0), font=F)
S.save(out); print(out, S.size)
