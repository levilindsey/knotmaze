# K1482 s43: a window picture zoomed with a bend's fillet drawn on it: the disc (radius rf, cyan), the rays from F
# to the feet (yellow), the feet (magenta), device-pixel ticks every 4 px on the border.
#   python geo43.py <png> <x0> <y0> <cx> <cy> <r> <z> <out.png> <Fx,Fy,rf,fax,fay,fbx,fby>...   (env B=1 brightens)
import os, sys
from PIL import Image, ImageDraw

p, x0, y0, cx, cy, r, z, out = sys.argv[1], *map(int, sys.argv[2:8]), sys.argv[8]
im = Image.open(p).convert("RGB").crop((cx - r - x0, cy - r - y0, cx + r - x0, cy + r - y0))
if os.environ.get("B") == "1":
    im = im.point(lambda v: max(0, min(255, (v - 14) * 7)))
T = 2 * r * z
im = im.resize((T, T), Image.NEAREST)
d = ImageDraw.Draw(im)
D = lambda X, Y: ((X - (cx - r)) * z, (Y - (cy - r)) * z)
for k in range(0, 2 * r + 1, 4):
    d.line([(k * z, 0), (k * z, 6)], fill=(255, 0, 0)); d.line([(0, k * z), (6, k * z)], fill=(255, 0, 0))
    d.text((k * z + 1, 7), str(cx - r + k), fill=(255, 255, 255)) if k % 8 == 0 else None
    d.text((8, k * z - 5), str(cy - r + k), fill=(255, 255, 255)) if k % 8 == 0 and k else None
for s in sys.argv[9:]:
    Fx, Fy, rf, ax, ay, bx, by = map(float, s.split(","))
    F = D(Fx, Fy)
    d.ellipse([F[0] - rf * z, F[1] - rf * z, F[0] + rf * z, F[1] + rf * z], outline=(0, 255, 255))
    for X, Y in ((ax, ay), (bx, by)):
        q = D(X, Y); d.line([F, q], fill=(255, 255, 0)); d.ellipse([q[0] - 3, q[1] - 3, q[0] + 3, q[1] + 3], fill=(255, 0, 255))
im.save(out)
print(out, im.size)
