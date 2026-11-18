# K1460 s5: junction B's interior difference, today against gf recoloured to today's thread colour (recol.py's map),
# counted only where today's 5x5 neighbourhood is smooth (luminance range < 40: no edge, no border-look rim).
#   python jbdiff.py <shot dir> <cx,cy,r css> <fades,...> <modes,...>   reads <dir>/shot_<mode>_<fade>.png
import sys
import numpy as np
from PIL import Image
def _win(a, k, fn):
    p = k // 2; P = np.pad(a, p, mode="edge"); out = None
    for dy in range(k):
        for dx in range(k):
            s = P[dy:dy + a.shape[0], dx:dx + a.shape[1]]; out = s if out is None else fn(out, s)
    return out
maximum_filter = lambda a, k: _win(a, k, np.maximum)
minimum_filter = lambda a, k: _win(a, k, np.minimum)
bg = np.array([0x15, 0x1b, 0x28], float); g = np.array([0xe1, 0x95, 0xe8], float); tc = np.array([0xcc, 0x7a, 0xc0], float)
d0, cx, cy, r = sys.argv[1], *[int(v) for v in sys.argv[2].split(",")]
X0, Y0, X1, Y1 = 2 * (cx - r), 2 * (cy - r), 2 * (cx + r), 2 * (cy + r)
for f in sys.argv[3].split(","):
    t = np.asarray(Image.open(f"{d0}/shot_today_{f}.png").convert("RGB")).astype(float)[Y0:Y1, X0:X1]
    tl = t.mean(axis=2); smooth = (maximum_filter(tl, 5) - minimum_filter(tl, 5)) < 40
    row = [f"fl {f:>4}"]
    for m in sys.argv[4].split(","):
        a = np.asarray(Image.open(f"{d0}/shot_{m}_{f}.png").convert("RGB")).astype(float)[Y0:Y1, X0:X1]
        b = bg + (a - bg) * (tc - bg) / (g - bg)
        d = np.abs(t - b).max(axis=2); di = np.where(smooth, d, 0)
        row.append(f"{m}: interior max {di.max():3.0f} px>20 {int((di > 20).sum()):4d}")
    print("  ".join(row))


