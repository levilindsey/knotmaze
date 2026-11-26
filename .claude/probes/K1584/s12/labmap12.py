# K1584 s12: lab12.ts's labels as a colour map beside a capture crop: each pixel's label chain (hue), darkened by
# (1 - ink) so the outline reads; winKind 2/4 (fillet arc / tangent point) tinted yellow.
#   python labmap12.py <lab.json> <png> <out.png> [--scale 8]
import json, sys, colorsys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
a = sys.argv[1:]
sc = 8
if "--scale" in a: i = a.index("--scale"); sc = int(a[i + 1]); del a[i:i + 2]
J = json.load(open(a[0])); x0, y0, x1, y1 = J["box"]; w, h = x1 - x0 + 1, y1 - y0 + 1
img = np.zeros((h, w, 3), np.uint8)
seen = {}
for X, Y, c, ink, s, wk, wa, wb in J["rows"]:
    if c < 0: col = (40, 40, 40)
    else:
        hue = (c * 0.61803) % 1.0
        r, g, b = colorsys.hsv_to_rgb(hue, 0.6, 0.95)
        k = 1 - 0.8 * min(1, ink)
        col = (int(r * 255 * k), int(g * 255 * k), int(b * 255 * k))
        if wk in (2, 4) and ink > 0.3: col = (200, 200, 0)
        seen.setdefault(c, (int(r * 255), int(g * 255), int(b * 255)))
    img[Y - y0, X - x0] = col
cap = np.asarray(Image.open(a[1]).convert("RGB")).astype(np.float32)[y0:y1 + 1, x0:x1 + 1]
cap = np.clip((cap - 18) / 24 * 255, 0, 255).astype(np.uint8)
L = Image.fromarray(img).resize((w * sc, h * sc), Image.NEAREST); C = Image.fromarray(cap).resize((w * sc, h * sc), Image.NEAREST)
sheet = Image.new("RGB", (2 * w * sc + 8, h * sc + 20), (30, 30, 30)); sheet.paste(L, (0, 20)); sheet.paste(C, (w * sc + 8, 20))
d = ImageDraw.Draw(sheet)
try: f = ImageFont.truetype("arial.ttf", 13)
except Exception: f = ImageFont.load_default()
xx = 4
for c, col in sorted(seen.items()): d.text((xx, 3), str(c), fill=col, font=f); xx += 30
sheet.save(a[2]); print(a[2], sheet.size)
