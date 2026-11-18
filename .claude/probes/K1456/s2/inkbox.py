# K1456 s2: dark-ink pixel counts in ten named boxes of restab.mjs captures (900x900 at DSF 1), so two builds
# compare by ink, not by pixel diff (captures of one build differ load to load by 1-2 levels on stroke edges).
# Ink = luminance below THRESH (0-255). Prints one row per image and, for each later image, the per-box delta
# against the first.
#   python inkbox.py <a.png> <b.png> [c.png ...]     env THRESH=80
import os, sys
import numpy as np
from PIL import Image

# link A's backdrop is dark (luminance p50 29.5, p25 26.7); gf's strokes sit at about 20 (p10 20.3)
THRESH = float(os.environ.get("THRESH", "23"))
# (name, x0, y0, x1, y1) in CSS px of the 900x900 capture; a 3-row ring of boxes plus the middle
BOXES = [
    ("NW", 60, 60, 260, 260), ("N", 350, 60, 550, 260), ("NE", 640, 60, 840, 260),
    ("W", 60, 350, 260, 550), ("C", 350, 350, 550, 550), ("E", 640, 350, 840, 550),
    ("SW", 60, 640, 260, 840), ("S", 350, 640, 550, 840), ("SE", 640, 640, 840, 840),
    ("mid", 200, 200, 700, 700),
]


def counts(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    s = im.shape[1] / 900.0
    lum = 0.299 * im[..., 0] + 0.587 * im[..., 1] + 0.114 * im[..., 2]
    ink = lum < THRESH
    return [int(ink[int(y0 * s):int(y1 * s), int(x0 * s):int(x1 * s)].sum()) for _, x0, y0, x1, y1 in BOXES]


rows = [(p, counts(p)) for p in sys.argv[1:]]
print("image".ljust(44) + "".join(n.rjust(8) for n, *_ in BOXES))
for p, c in rows:
    print(os.path.basename(p).ljust(44) + "".join(str(v).rjust(8) for v in c))
base = rows[0][1]
for p, c in rows[1:]:
    d = [v - b for v, b in zip(c, base)]
    a = np.asarray(Image.open(rows[0][0]).convert("RGB")).astype(np.int32)
    px = np.abs(np.asarray(Image.open(p).convert("RGB")).astype(np.int32) - a).max(-1)
    print(("d " + os.path.basename(p)).ljust(44) + "".join(str(v).rjust(8) for v in d) + f"   max|d| {max(abs(v) for v in d)}   px differing {int((px > 0).sum())}")
