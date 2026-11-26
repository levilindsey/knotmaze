# K1584 s5: tile sheets of inverted, contrast-stretched crops. python tiles.py <spec.json> <out.png> [scale=3] [half=40]
# spec: rows, each [rowLabel, [[imgPath, cx, cy, tileLabel], ...]] (image pixels; gf_b2.png at the cnt json's dev).
import sys, json
import numpy as np
from PIL import Image, ImageDraw
spec = json.load(open(sys.argv[1])); out = sys.argv[2]
sc = int(sys.argv[3]) if len(sys.argv) > 3 else 3; hf = int(sys.argv[4]) if len(sys.argv) > 4 else 40
cache = {}
def img(p):
    if p not in cache: cache[p] = np.asarray(Image.open(p).convert('L')).astype(np.float32)
    return cache[p]
T = 2 * hf * sc; LW = 150; pad = 4
ncol = max(len(r[1]) for r in spec)
W = LW + ncol * (T + pad); H = len(spec) * (T + 18 + pad)
S = Image.new('RGB', (W, H), (40, 40, 40)); d = ImageDraw.Draw(S)
for ri, (rl, tiles) in enumerate(spec):
    y0 = ri * (T + 18 + pad)
    d.text((4, y0 + 4), rl, fill=(255, 255, 0))
    def crop(p, cx, cy):
        a = img(p)
        c = np.full((2 * hf, 2 * hf), 255, np.float32)
        y1, y2, x1, x2 = max(0, cy - hf), min(a.shape[0], cy + hf), max(0, cx - hf), min(a.shape[1], cx + hf)
        if y2 > y1 and x2 > x1: c[y1 - (cy - hf):y2 - (cy - hf), x1 - (cx - hf):x2 - (cx - hf)] = a[y1:y2, x1:x2]
        return c
    def stretch(c):
        c = 255 - c
        lo, hi = np.percentile(c, 1), np.percentile(c, 99.5)
        return np.clip((c - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)
    for ci, (p, cx, cy, tl) in enumerate(tiles):
        cx = int(round(cx)); cy = int(round(cy))
        if p.startswith('DIFF:'):  # DIFF:<before>|<after>: the after crop, ink removed in red, ink added in green
            pa, pb = p[5:].split('|'); ca, cb = crop(pa, cx, cy), crop(pb, cx, cy)
            g = stretch(cb) // 2; rgb = np.stack([g, g, g], -1)
            rgb[(cb - ca) > 6] = (255, 40, 40); rgb[(cb - ca) < -6] = (40, 255, 40)
            t = Image.fromarray(rgb.astype(np.uint8), 'RGB').resize((T, T), Image.NEAREST)
        else:
            t = Image.fromarray(stretch(crop(p, cx, cy))).resize((T, T), Image.NEAREST).convert('RGB')
        x0 = LW + ci * (T + pad)
        S.paste(t, (x0, y0 + 16))
        d.text((x0 + 2, y0 + 2), tl, fill=(200, 200, 255))
        m = T // 2
        d.line([(x0 + m - 4, y0 + 16 + m), (x0 + m + 4, y0 + 16 + m)], fill=(255, 0, 0))
        d.line([(x0 + m, y0 + 12 + m), (x0 + m, y0 + 20 + m)], fill=(255, 0, 0))
S.save(out); print(out, S.size)
