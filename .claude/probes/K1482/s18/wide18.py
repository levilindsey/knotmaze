# K1482 s18: wide context tiles of one frame at spots (a cyan ring marks the spot). python wide18.py out.png frame.png name@x:y,... [Z=4] [H=40]
import sys
import numpy as np
from PIL import Image, ImageDraw
out, f, spots = sys.argv[1:4]
Z = int(sys.argv[4]) if len(sys.argv) > 4 else 4
H = int(sys.argv[5]) if len(sys.argv) > 5 else 40
A = np.asarray(Image.open(f).convert("RGB")).astype(int)
rows = spots.split(","); W = 2 * H * Z; per = 3
sheet = Image.new("RGB", (per * (W + 6), ((len(rows) + per - 1) // per) * (W + 6)), "white")
for i, s in enumerate(rows):
    nm, p = s.split("@"); cx, cy = map(int, p.split(":"))
    c = A[cy - H:cy + H, cx - H:cx + H]
    im = Image.fromarray(np.clip((c - 14) * 4, 0, 255).astype(np.uint8)).resize((W, W), Image.NEAREST)
    dr = ImageDraw.Draw(im); r = 3 * Z
    dr.ellipse((H * Z - r, H * Z - r, H * Z + r, H * Z + r), outline=(0, 255, 255))
    dr.rectangle((0, 0, 7 * len(s) + 4, 13), fill=(0, 0, 0)); dr.text((3, 1), s, fill=(255, 255, 0))
    sheet.paste(im, ((i % per) * (W + 6), (i // per) * (W + 6)))
sheet.save(out); print(out, sheet.size)
