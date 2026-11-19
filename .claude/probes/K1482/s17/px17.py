import sys, numpy as np
from PIL import Image
L = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int).sum(2)
x0, y0, R = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
for p in sys.argv[4:]:
    a = L(p); print(p[-30:])
    for y in range(y0 - R, y0 + R + 1): print(y, " ".join(f"{a[y, x]:3d}" for x in range(x0 - R, x0 + R + 1)))
