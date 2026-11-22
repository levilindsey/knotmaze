# K1582 (27Z5): pixel differences inside the K1444 spots' red boxes.
#   python boxdiff.py <a.png> <b.png> <cx> <cy> [half]
# Prints "box px>0 px>2 maxd" : pixels whose largest channel difference is
# over 0 / over 2 levels, and the largest difference, in the (2*half)^2
# device-px box centred at (cx, cy) -- wide4.py's D=160 detail box (half 80).
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int)
b = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(int)
cx, cy = float(sys.argv[3]), float(sys.argv[4])
half = int(sys.argv[5]) if len(sys.argv) > 5 else 80
x0, y0 = int(round(cx - half)), int(round(cy - half))
d = np.abs(a[y0:y0 + 2 * half, x0:x0 + 2 * half] - b[y0:y0 + 2 * half, x0:x0 + 2 * half]).max(axis=2)
print(f"box px>0 {int((d > 0).sum())} px>2 {int((d > 2).sum())} maxd {int(d.max())} box {x0},{y0} {2 * half}px")
