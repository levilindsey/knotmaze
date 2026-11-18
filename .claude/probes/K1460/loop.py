# K1460 s3: the kink loop's largest step in the fade's level (Done 2, item 1). Reads loopgeo.mjs's centreline and
# samples each shot along it (and along lateral lines at +-0.35 h): the colour every 2 device px, the step = the
# largest channel change between neighbours /255. Stations within EXCL world of the under pass (the over thread's
# body and edges, drawn by every renderer) are skipped. Prints, per shot, the largest step and where (arc from the
# under pass), and the largest step on each lateral line.
#
#   python loop.py <geo.json> <EXCL> <png>[=label] ...
import json, sys
import numpy as np
from PIL import Image

geo = json.load(open(sys.argv[1]))
excl = float(sys.argv[2])
prof = np.array(geo["prof"])  # da, x, y, nx, ny (device px)
h = geo["hDev"]
ppw = geo["pxPerWorld"]
stride = max(1, int(round(2.0 / (0.01 * ppw))))

def bil(img, x, y):
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    fx = fx[:, None]; fy = fy[:, None]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy

print(f"crossing {geo['ci']} loop {geo['loopLen']:.3f} world, h {h:.1f} dev px, {ppw:.1f} dev px/world, excl {excl}")
for arg in sys.argv[3:]:
    path, _, label = arg.partition("=")
    img = np.asarray(Image.open(path).convert("RGB")).astype(float)
    out = []
    for off in (0.0, -0.35, 0.35):
        P = prof[::stride]
        x = P[:, 1] + P[:, 3] * off * h; y = P[:, 2] + P[:, 4] * off * h
        c = bil(img, x, y)
        st = np.abs(np.diff(c, axis=0)).max(axis=1) / 255.0
        da = (P[1:, 0] + P[:-1, 0]) / 2
        keep = (np.abs(da) > excl) & (np.abs(da - geo["loopLen"]) > excl)
        st = np.where(keep, st, 0)
        k = int(np.argmax(st))
        out.append((st[k], da[k]))
    c0 = out[0]
    print(f"{label or path:>14}: centre {c0[0]:.3f} at {c0[1]:+.2f}   lateral -0.35h {out[1][0]:.3f} at {out[1][1]:+.2f}   +0.35h {out[2][0]:.3f} at {out[2][1]:+.2f}   max {max(o[0] for o in out):.3f}")
