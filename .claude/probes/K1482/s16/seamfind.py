# K1482 s16: light pixels between two ink bands near a point: non-ink (RGB sum > 73) with ink on both sides along
# some axis (h, v or a diagonal) within 2 px. Prints them with their sums, and a char map of the window.
#   python seamfind.py <frame.png> <x> <y> [R=10]
import sys
import numpy as np
from PIL import Image
f, x0, y0 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
R = int(sys.argv[4]) if len(sys.argv) > 4 else 10
S = np.asarray(Image.open(f).convert("RGB")).astype(int).sum(2)
I = S <= 73
hits = []
for y in range(y0 - R, y0 + R + 1):
    row = ""
    for x in range(x0 - R, x0 + R + 1):
        if I[y, x]: row += "#"; continue
        seam = False
        for dx, dy in ((1, 0), (0, 1), (1, 1), (1, -1)):
            a = any(I[y - k * dy, x - k * dx] for k in (1, 2))
            b = any(I[y + k * dy, x + k * dx] for k in (1, 2))
            if a and b: seam = True
        if seam: hits.append((x, y, int(S[y, x]))); row += "o"
        else: row += "."
    print(f"{y:5d} {row}")
print("x from", x0 - R)
print("seam px:", hits)
