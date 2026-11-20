# K1530: what kind of difference? delta histogram + 1px shift test + sample pixels.
import sys
from PIL import Image
import numpy as np
a = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.int16)
b = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(np.int16)
d = np.abs(a - b).max(axis=2)
for t in [0, 1, 2, 4, 8, 16, 32, 64, 128]:
    print(f"delta>{t}: {int((d > t).sum())}")
def shifted(bb, dx, dy):
    out = np.zeros_like(bb)
    xs = slice(max(0, dx), bb.shape[1] + min(0, dx)); xt = slice(max(0, -dx), bb.shape[1] + min(0, -dx))
    ys = slice(max(0, dy), bb.shape[0] + min(0, dy)); yt = slice(max(0, -dy), bb.shape[0] + min(0, -dy))
    out[yt, xt] = bb[ys, xs]
    return out
for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1)]:
    dd = np.abs(a - shifted(b, dx, dy)).max(axis=2)
    print(f"shift B by ({dx},{dy}): differ {int((dd > 0).sum())}")
ys, xs = np.nonzero(d > 64)
print("sample >64 px (x,y,A,B):")
for x, y in list(zip(xs[:6], ys[:6])):
    print(x, y, a[y, x].tolist(), b[y, x].tolist())
ys, xs = np.nonzero((d > 0) & (d <= 4))
print("sample 1..4 px (x,y,A,B):")
for x, y in list(zip(xs[:6], ys[:6])):
    print(x, y, a[y, x].tolist(), b[y, x].tolist())
