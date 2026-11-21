# K1482 s34: side-by-side crops of several captures (or mirror images) of one place, each stretched by the FIRST
# image's crop 1..99 percentiles (so border ink 30 levels off the paper reads), nearest-neighbour zoom, plus an
# optional diff panel (red = changed luminance >= T between the first two).
#   python crop34.py <out.png> <cx> <cy> <r> <zoom> <img1> [img2 ...] [--diff] [--T=6] [--nostretch]
import sys
import numpy as np
from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith("--")]
flags = [a for a in sys.argv[1:] if a.startswith("--")]
out, cx, cy, r, z = args[0], int(args[1]), int(args[2]), int(args[3]), int(args[4])
imgs = args[5:]
T = 6
for f in flags:
    if f.startswith("--T="): T = int(f[4:])
crops = [np.asarray(Image.open(p).convert("RGB").crop((cx - r, cy - r, cx + r, cy + r))).astype(np.float64) for p in imgs]
lum = lambda X: X[..., 0] * 0.299 + X[..., 1] * 0.587 + X[..., 2] * 0.114
if "--nostretch" not in flags:
    lo, hi = np.percentile(crops[0], 1), np.percentile(crops[0], 99)
    st = lambda X: np.clip((X - lo) * 255.0 / max(1.0, hi - lo), 0, 255)
else:
    st = lambda X: X
panels = [st(c) for c in crops]
if "--diff" in flags and len(crops) >= 2:
    d = np.abs(lum(crops[1]) - lum(crops[0])) >= T
    p = np.repeat((lum(st(crops[0])) * 0.35)[..., None], 3, axis=2)
    p[d] = [255, 60, 60]
    panels.append(p)
gap = 4
W = 2 * r * z
canvas = Image.new("RGB", (len(panels) * W + (len(panels) + 1) * gap, W + 2 * gap), (40, 40, 40))
for i, p in enumerate(panels):
    im = Image.fromarray(p.astype(np.uint8)).resize((W, W), Image.NEAREST)
    canvas.paste(im, (gap + i * (W + gap), gap))
canvas.save(out)
print(out, "panels", len(panels), "diffpx" if "--diff" in flags else "", int(d.sum()) if "--diff" in flags and len(crops) >= 2 else "")
