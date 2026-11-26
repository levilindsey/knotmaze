# K1584 s3: colour crops (auto-levelled per channel) of several captures, side by side, with crossing labels.
#   python rgbcrop.py <out.png> x y w h sc <gj.json|-> "Label=dir" ...
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; x, y, w, h, sc = map(int, sys.argv[2:7]); gj = sys.argv[7]; V = [s.split('=', 1) for s in sys.argv[8:]]
try: F = ImageFont.truetype('arial.ttf', 14)
except Exception: F = ImageFont.load_default()
G = json.load(open(gj))['crossings'] if gj != '-' else []
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
        if x <= px < x + w and y <= py < y + h: dr.text((ox + (px - x) * sc + 4, 22 + (py - y) * sc - 16), f"x{r['i']}", fill=(255, 255, 255), font=F)
S.save(out); print(out, S.size)
