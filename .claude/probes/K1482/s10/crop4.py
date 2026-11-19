# K1482 s10: side-by-side crops of several frames around one device point, each frame contrast-boosted, with the
# picked pixels circled. python crop4.py <out.png> <cx> <cy> <R> <Z> <label=frame.png> ... [--px x,y;x,y]
import sys
import numpy as np
from PIL import Image, ImageDraw
out, cx, cy, R, Z = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
rest = sys.argv[6:]; px = []
if "--px" in rest:
    i = rest.index("--px"); px = [tuple(int(v) for v in s.split(",")) for s in rest[i + 1].split(";") if s]; rest = rest[:i]
tiles = []
for a in rest:
    lbl, fp = a.split("=", 1)
    im = np.asarray(Image.open(fp).convert("RGB")).astype(float)[cy - R:cy + R, cx - R:cx + R]
    if not lbl.startswith("raw"):
        lo, hi = np.percentile(im, 1), np.percentile(im, 99.5); im = np.clip((im - lo) * 255 / max(hi - lo, 1), 0, 255)
    t = Image.fromarray(im.astype(np.uint8)).resize((2 * R * Z, 2 * R * Z), Image.NEAREST); d = ImageDraw.Draw(t)
    for x, y in px:
        q = ((x - cx + R) * Z + Z // 2, (y - cy + R) * Z + Z // 2); d.ellipse((q[0] - 5, q[1] - 5, q[0] + 5, q[1] + 5), outline=(255, 0, 0))
    d.text((3, 3), lbl, fill=(255, 255, 0)); tiles.append(t)
W = 2 * R * Z
sheet = Image.new("RGB", (len(tiles) * (W + 6), W), "white")
for i, t in enumerate(tiles): sheet.paste(t, (i * (W + 6), 0))
sheet.save(out); print(out, sheet.size)
