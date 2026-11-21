# K1482 s43: a quick strip of window pictures side by side, cropped around device (cx, cy), radius r, zoom z, labelled.
#   python strip43.py <out.png> <x0> <y0> <cx> <cy> <r> <z> <png:label>...
#   env B=1 brightens as stage 39 does ((v - 14) * 7).
#   (each png is a window whose top-left is device (x0, y0); a png path of "cap=<frame.png>" crops a full frame instead)
import os, sys
from PIL import Image, ImageDraw

out, x0, y0, cx, cy, r, z = sys.argv[1], *map(int, sys.argv[2:8])
items = [a.rsplit(":", 1) for a in sys.argv[8:]]
T = (2 * r) * z
W = Image.new("RGB", (len(items) * (T + 6), T + 16), (255, 255, 255))
d = ImageDraw.Draw(W)
for i, (p, lab) in enumerate(items):
    if p.startswith("cap="):
        im = Image.open(p[4:]).convert("RGB").crop((cx - r, cy - r, cx + r, cy + r))
    else:
        im = Image.open(p).convert("RGB").crop((cx - r - x0, cy - r - y0, cx + r - x0, cy + r - y0))
    if os.environ.get("B") == "1":
        im = im.point(lambda v: max(0, min(255, (v - 14) * 7)))
    im = im.resize((T, T), Image.NEAREST)
    dd = ImageDraw.Draw(im)
    dd.line([(T // 2 - 6, T // 2), (T // 2 + 6, T // 2)], fill=(255, 0, 0)); dd.line([(T // 2, T // 2 - 6), (T // 2, T // 2 + 6)], fill=(255, 0, 0))
    W.paste(im, (i * (T + 6), 16)); d.text((i * (T + 6) + 2, 2), lab, fill=(0, 0, 0))
W.save(out)
print(out, W.size)
