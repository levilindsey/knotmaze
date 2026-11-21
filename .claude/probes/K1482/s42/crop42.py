# K1482 s42: one crop of a capture (or a mirror PGM) around a device px, nearest-neighbour zoom, a red cross at the
# centre and grey ticks every 10 device px with their coordinates; B=1 brightens with place39's stretch (v - 14) * 7.
#   python crop42.py <img> <x> <y> <R> <Z> <out.png> [ox oy]   (ox, oy: the image's device origin, for mirror PGMs)
import os, sys
from PIL import Image, ImageDraw

img, x, y, R, Z, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
ox, oy = (int(sys.argv[7]), int(sys.argv[8])) if len(sys.argv) > 8 else (0, 0)
im = Image.open(img).convert("RGB")
if os.environ.get("B"):
    im = im.point(lambda v: max(0, min(255, round((v - 14) * 7))))
t = im.crop((x - R - ox, y - R - oy, x + R + 1 - ox, y + R + 1 - oy)).resize(((2 * R + 1) * Z, (2 * R + 1) * Z), Image.NEAREST)
d = ImageDraw.Draw(t)
for v in range(x - R, x + R + 1):
    if v % 10 == 0:
        px = (v - (x - R)) * Z
        d.line([px, 0, px, 4], fill=(255, 0, 0)); d.text((px + 1, 5), str(v), fill=(255, 0, 0))
for v in range(y - R, y + R + 1):
    if v % 10 == 0:
        py = (v - (y - R)) * Z
        d.line([0, py, 4, py], fill=(255, 0, 0)); d.text((6, py + 1), str(v), fill=(255, 0, 0))
c = R * Z + Z // 2
d.line([c - 6, c, c + 6, c], fill=(255, 0, 0)); d.line([c, c - 6, c, c + 6], fill=(255, 0, 0))
t.save(out)
print(out, t.size)
