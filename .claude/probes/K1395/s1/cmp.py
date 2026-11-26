# K1395 s1: side-by-side crops of several shots, each scaled, with the changed-pixel count against the first.
#   python cmp.py <out.png> <x0> <y0> <x1> <y1> <scale> <img> [<img> ...]
import sys
from PIL import Image, ImageChops
out, x0, y0, x1, y1, sc = sys.argv[1], *map(int, sys.argv[2:6]), float(sys.argv[6])
ims = [Image.open(p).convert("RGB") for p in sys.argv[7:]]
crops = [im.crop((x0, y0, x1, y1)) for im in ims]
w, h = int((x1 - x0) * sc), int((y1 - y0) * sc)
sheet = Image.new("RGB", (w * len(crops) + 8 * (len(crops) - 1), h), (255, 255, 255))
for i, c in enumerate(crops):
    sheet.paste(c.resize((w, h), Image.NEAREST), (i * (w + 8), 0))
sheet.save(out)
for p, im in zip(sys.argv[8:], ims[1:]):
    d = ImageChops.difference(ims[0], im).convert("L").point(lambda v: 255 if v > 8 else 0)
    print(p, "changed px (>8):", sum(1 for v in d.getdata() if v))
