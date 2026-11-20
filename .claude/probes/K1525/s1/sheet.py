# K1525 s1 sheets in K1524 card.py's layout: per row, each column's surroundings (W px, red D px box, resized to T)
# then each column's box closer (NEAREST to T); colours stretched by each picture's 1st/99.5th percentiles.
#   python sheet.py <spec.json>
#   spec: { "out": path, "cols": [[label, root]], "rows": [[label, rel png, cx, cy]], "dist": 32 }
#   root/rel png is the picture; cx, cy in device px. Prints per row the count of px in the D box further than dist
#   (RGB euclidean, raw, unstretched) from the first column's.
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
spec = json.load(open(sys.argv[1]))
font = ImageFont.truetype('arial.ttf', 17)
_c = {}
def load(p):
    if p not in _c:
        im = Image.open(p).convert('RGB'); a = np.asarray(im).astype(float)
        _c[p] = (im, a, np.percentile(a, 1), np.percentile(a, 99.5))
    return _c[p]
def crop(p, cx, cy, box):
    im, a, lo, hi = load(p)
    x0, y0 = int(round(cx - box / 2)), int(round(cy - box / 2))
    c = np.asarray(im.crop((x0, y0, x0 + box, y0 + box))).astype(float)
    return Image.fromarray(np.clip((c - lo) * 255 / max(hi - lo, 1), 0, 255).astype('uint8')), x0, y0
def raw(p, cx, cy, box):
    im, a, lo, hi = load(p)
    x0, y0 = int(round(cx - box / 2)), int(round(cy - box / 2))
    return np.asarray(im.crop((x0, y0, x0 + box, y0 + box))).astype(float)
W, D, T = spec.get('W', 300), spec.get('D', 76), spec.get('T', 304)
dist = spec.get('dist', 32)
cols = spec['cols']; rows = spec['rows']
n = len(cols); lh = T + 28
sh = Image.new('RGB', (T * 2 * n + 8 * (2 * n - 1), len(rows) * (lh + 12) - 12), (255, 255, 255))
res = []
for r, (lab, rel, cx, cy) in enumerate(rows):
    oy = r * (lh + 12)
    rp = lambda col: rel.replace(col[2][0], col[2][1]) if len(col) > 2 else rel
    ref = raw(os.path.join(cols[0][1], rp(cols[0])), cx, cy, D)
    counts = []
    for c, col in enumerate(cols):
        cl, root = col[0], col[1]; p = os.path.join(root, rp(col))
        ctx, x0, y0 = crop(p, cx, cy, W); ctx = ctx.resize((T, T), Image.LANCZOS)
        k = T / W; bx, by = (cx - D / 2 - x0) * k, (cy - D / 2 - y0) * k
        ImageDraw.Draw(ctx).rectangle((bx, by, bx + D * k, by + D * k), outline=(255, 60, 60), width=2)
        det, _, _ = crop(p, cx, cy, D); det = det.resize((T, T), Image.NEAREST)
        ImageDraw.Draw(det).rectangle((0, 0, T - 1, T - 1), outline=(255, 60, 60), width=2)
        xs = [c * (T + 8), (n + c) * (T + 8)]
        sh.paste(ctx, (xs[0], oy + 28)); sh.paste(det, (xs[1], oy + 28))
        d = ImageDraw.Draw(sh)
        cnt = int((np.sqrt(((raw(p, cx, cy, D) - ref) ** 2).sum(-1)) > dist).sum())
        counts.append(cnt)
        d.text((xs[0], oy + 5), f'{lab}: {cl}', fill=(20, 20, 40), font=font)
        d.text((xs[1], oy + 5), f'{cl}, box closer ({cnt} px)', fill=(20, 20, 40), font=font)
    res.append((lab, counts))
    print(f'{lab:40s} ' + ' | '.join(f'{col[0]}={v}' for col, v in zip(cols, counts)))
out = spec['out']; os.makedirs(os.path.dirname(out), exist_ok=True)
sh.save(out, optimize=True)
sh.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(out[:-4] + '_q.png', optimize=True)
json.dump(res, open(out[:-4] + '.json', 'w'))
print(out, sh.size)
