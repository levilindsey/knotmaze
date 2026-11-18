# K1460 s4: a thin line across a thread (junction B's 2 o'clock line, the notch at fade 0). Samples each shot along
# loopgeo.mjs's centreline and lateral lines at full station resolution (0.01 world, about 0.45 device px), the
# luminance at each station; a station's dip = the darker of the two neighbourhoods' brightest (W stations each side)
# minus its own luminance, /255: a thin dark line reads high, a monotonic fade ramp reads about 0. Stations within EXCL
# world of either pass, or past them, are skipped (the over thread's edges), and so is any station where the REF shot
# (today) dips more than 0.02 within W stations: a line today draws too (another thread's edge) is geometry.
# Prints the largest dip per shot and where.
#
#   python dip.py <geo.json> <EXCL> <ref png> <png>[=label] ...      env W=5 (stations per side)
import json, os, sys
import numpy as np
from PIL import Image

geo = json.load(open(sys.argv[1]))
excl = float(sys.argv[2])
prof = np.array(geo["prof"])  # da, x, y, nx, ny (device px)
h = geo["hDev"]
W = int(os.environ.get("W", "5"))
OFFS = (0.0, -0.4, -0.2, 0.2, 0.4)

def bil(img, x, y):
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy

print(f"crossing {geo['ci']} loop {geo['loopLen']:.3f} world, h {h:.1f} dev px, W {W}, excl {excl}")
def dips(img, off):
    x = prof[:, 1] + prof[:, 3] * off * h; y = prof[:, 2] + prof[:, 4] * off * h
    L = bil(img, x, y)
    n = len(L); dip = np.zeros(n)
    for i in range(W, n - W):
        dip[i] = min(L[i - W:i].max(), L[i + 1:i + 1 + W].max()) - L[i]
    return dip / 255.0

ref = np.asarray(Image.open(sys.argv[3]).convert("L")).astype(float)
for arg in sys.argv[4:]:
    path, _, label = arg.partition("=")
    img = np.asarray(Image.open(path).convert("L")).astype(float)
    res = []
    for off in OFFS:
        dip = dips(img, off)
        rd = dips(ref, off)
        refmax = np.array([rd[max(0, i - W):i + W + 1].max() for i in range(len(rd))])
        da = prof[:, 0]
        keep = (da > excl) & (da < geo["loopLen"] - excl) & (refmax < 0.02)
        dip = np.where(keep, dip, 0)
        k = int(np.argmax(dip))
        res.append((dip[k], da[k], off))
    best = max(res)
    print(f"{label or path:>14}: max {best[0]:.3f} at {best[1]:+.2f} (lateral {best[2]:+.1f}h)   " + "  ".join(f"{o:+.1f}h {d:.3f}@{a:+.2f}" for d, a, o in res))
