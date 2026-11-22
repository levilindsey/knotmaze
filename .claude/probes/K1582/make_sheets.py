# K1582 (27Z5): the o_spots sheets again, one per spot, plus bisect crops.
# wide4.py's recipe: per column a W=480 device-px context resized to T=320
# with the red D=160 box drawn, then the box itself at T=320; each file's
# levels stretched by its own 1st..99.5th percentile, as in wide4.py.
#   python make_sheets.py sheet <out.png> <label:path>... -- <cx> <cy>
#   python make_sheets.py crop  <out.png> <label:path>... -- <cx> <cy>
# sheet: one row of contexts, then one row of boxes (wide4.stack's row).
# crop:  the boxes only, side by side.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
W, D, T = 480, 160, 320
font = ImageFont.truetype("arial.ttf", 17)
_cache = {}
def load(p):
    if p not in _cache:
        im = Image.open(p).convert("RGB"); a = np.asarray(im).astype(float)
        _cache[p] = (im, np.percentile(a, 1), np.percentile(a, 99.5))
    return _cache[p]
def crop(p, cx, cy, box):
    im, lo, hi = load(p)
    x0, y0 = int(round(cx - box / 2)), int(round(cy - box / 2))
    a = np.asarray(im.crop((x0, y0, x0 + box, y0 + box))).astype(float)
    return Image.fromarray(np.clip((a - lo) * 255 / (hi - lo), 0, 255).astype("uint8")), x0, y0
mode, out = sys.argv[1], sys.argv[2]
sep = sys.argv.index("--")
cols = [s.split(":", 1) for s in sys.argv[3:sep]]
cx, cy = float(sys.argv[sep + 1]), float(sys.argv[sep + 2])
n = len(cols)
if mode == "sheet":
    sh = Image.new("RGB", (T * n + 8 * (n - 1), 2 * (T + 28) - 18), (255, 255, 255))
    for c, (cl, p) in enumerate(cols):
        ctx, x0, y0 = crop(p, cx, cy, W); ctx = ctx.resize((T, T), Image.LANCZOS)
        k = T / W; bx, by = (cx - D / 2 - x0) * k, (cy - D / 2 - y0) * k
        ImageDraw.Draw(ctx).rectangle((bx, by, bx + D * k, by + D * k), outline=(255, 60, 60), width=2)
        det, _, _ = crop(p, cx, cy, D); det = det.resize((T, T), Image.LANCZOS)
        ImageDraw.Draw(det).rectangle((0, 0, T - 1, T - 1), outline=(255, 60, 60), width=2)
        x = c * (T + 8)
        sh.paste(ctx, (x, 28)); sh.paste(det, (x, 28 + T + 28))
        d = ImageDraw.Draw(sh)
        d.text((x, 5), cl, fill=(20, 20, 40), font=font)
        d.text((x, T + 28 + 5), cl + ": the red box, closer", fill=(20, 20, 40), font=font)
else:
    sh = Image.new("RGB", (T * n + 8 * (n - 1), T + 28), (255, 255, 255))
    for c, (cl, p) in enumerate(cols):
        det, _, _ = crop(p, cx, cy, D); det = det.resize((T, T), Image.LANCZOS)
        ImageDraw.Draw(det).rectangle((0, 0, T - 1, T - 1), outline=(255, 60, 60), width=2)
        x = c * (T + 8)
        sh.paste(det, (x, 28))
        ImageDraw.Draw(sh).text((x, 5), cl, fill=(20, 20, 40), font=font)
sh.save(out, optimize=True)
print(out, sh.size)
