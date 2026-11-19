# K1482 s18: where start and tip differ at fl 0 or 1.2 (green) against the named sites (red), half scale.
#   python flmap18.py <raw dir> <out.png>
import json, sys
import numpy as np
from PIL import Image, ImageDraw
R = sys.argv[1]; out = sys.argv[2]
S = json.load(open(f"{R}/start/sites_gf.json"))["sites"]
I = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int)
a0, b0 = I(f"{R}/fls_start/gf_fls0.png"), I(f"{R}/fls_tip/gf_fls0.png")
a1, b1 = I(f"{R}/fls_start/gf_fls1.2.png"), I(f"{R}/fls_tip/gf_fls1.2.png")
ch = (np.abs(a0 - b0).sum(2) > 24) | (np.abs(a1 - b1).sum(2) > 24)
im = Image.fromarray(a0.astype(np.uint8)); d = ImageDraw.Draw(im)
ys, xs = np.nonzero(ch)
for x, y in zip(xs, ys): d.rectangle([x - 3, y - 3, x + 3, y + 3], fill=(0, 255, 0))
for s in S: d.ellipse([s["x"] - 9, s["y"] - 9, s["x"] + 9, s["y"] + 9], outline=(255, 0, 0), width=4)
xs0 = [s["x"] for s in S]; ys0 = [s["y"] for s in S]
x0, x1, y0, y1 = (int(v) for v in (0,0,0,0)); x0, x1, y0, y1 = max(0, min(xs0) - 80), min(im.width, max(xs0) + 80), max(0, min(ys0) - 80), min(im.height, max(ys0) + 80)
x0, x1, y0, y1 = int(x0), int(x1), int(y0), int(y1); im = im.crop((x0, y0, x1, y1))
for gx in range((x0 // 100 + 1) * 100, x1, 100): ImageDraw.Draw(im).line([gx - x0, 0, gx - x0, 12], fill=(255, 255, 0), width=2)
for gy in range((y0 // 100 + 1) * 100, y1, 100): ImageDraw.Draw(im).line([0, gy - y0, 12, gy - y0], fill=(255, 255, 0), width=2)
im = im.resize((im.width // 2, im.height // 2))
im.save(out); print(out, (x0, y0, x1, y1), im.size)

