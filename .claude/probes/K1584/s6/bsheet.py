# K1584 s6: a sheet of places, one row each: crops of several captures side by side (region.py's tone map).
#   python bsheet.py <out.png> <scale> <half> <capTemplate,...> <labels,...> <m:x:y[:tag]> ...
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out, sc, hf = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
caps = sys.argv[4].split(','); labs = sys.argv[5].split(','); pl = sys.argv[6:]
try: fnt = ImageFont.truetype('arialbd.ttf', 14)
except Exception: fnt = ImageFont.load_default()
cache = {}
def img(p):
    if p not in cache: cache[p] = np.asarray(Image.open(p + r'\gf_b2.png').convert('L')).astype(np.float32)
    return cache[p]
S = 2 * hf * sc; rows = []
for q in pl:
    f = q.split(':'); m, x, y = f[0], int(float(f[1])), int(float(f[2])); tag = f[3] if len(f) > 3 else ''
    row = Image.new('RGB', (len(caps) * (S + 6), S + 18), (60, 60, 60)); d = ImageDraw.Draw(row)
    for k, c in enumerate(caps):
        g = img(c.replace('{m}', m)); x0 = max(0, x - hf); y0 = max(0, y - hf)
        a = g[y0:y0 + 2 * hf, x0:x0 + 2 * hf]
        t = np.clip((a - 18) / 24 * 255, 0, 255).astype(np.uint8)
        im = Image.fromarray(t).resize((a.shape[1] * sc, a.shape[0] * sc), Image.NEAREST).convert('RGB')
        row.paste(im, (k * (S + 6), 18))
        d.text((k * (S + 6) + 2, 1), '%s %s %d,%d %s' % (labs[k], m, x, y, tag), fill=(255, 255, 0), font=fnt)
    rows.append(row)
W = max(r.size[0] for r in rows); H = sum(r.size[1] + 4 for r in rows)
sh = Image.new('RGB', (W, H), (30, 30, 30)); yy = 0
for r in rows: sh.paste(r, (0, yy)); yy += r.size[1] + 4
sh.save(out); print(out, sh.size)
