# K1482 s19: zoom tiles of named spots across several frames (levels stretched), one row per spot, one column per frame;
# light pixels (RGB sum > 73) inside a dark neighbourhood are not marked: this is for looking, by eye.
#   python z19.py <out.png> <spot,spot,...> <frame.png> [frame.png ...]     spot = name@x:y[:half]   env Z=10
import sys, os
import numpy as np
from PIL import Image, ImageDraw
out, spots, *frames = sys.argv[1:]
Z = int(os.environ.get("Z", 10))
L = lambda f: np.asarray(Image.open(f).convert("RGB")).astype(int)
F = [L(f) for f in frames]
rows = []
for sp in spots.split(","):
    nm, p = sp.split("@"); v = list(map(int, p.split(":"))); cx, cy = v[0], v[1]; H = v[2] if len(v) > 2 else 12
    rows.append((nm, cx, cy, H))
Wm = max(2 * H * Z for _, _, _, H in rows)
sheet = Image.new("RGB", (len(F) * (Wm + 6), sum(2 * H * Z + 6 for *_, H in rows)), "white")
yo = 0
for nm, cx, cy, H in rows:
    W = 2 * H * Z
    for c, A in enumerate(F):
        crop = A[cy - H:cy + H, cx - H:cx + H]
        im = np.clip((crop - 14) * 6, 0, 255).astype(np.uint8)
        t = Image.fromarray(im).resize((W, W), Image.NEAREST); dr = ImageDraw.Draw(t)
        for k in range(0, 2 * H + 1, 4):  # a tick every 4 px on the top and left edges
            dr.line((k * Z, 0, k * Z, 4), fill=(255, 255, 0)); dr.line((0, k * Z, 4, k * Z), fill=(255, 255, 0))
        lab = f"{nm} {cx-H},{cy-H} [{c}]"
        dr.rectangle((0, 6, 7 * len(lab) + 4, 19), fill=(0, 0, 0)); dr.text((3, 7), lab, fill=(255, 255, 0))
        sheet.paste(t, (c * (Wm + 6), yo))
    yo += W + 6
sheet.save(out); print(out, sheet.size)
