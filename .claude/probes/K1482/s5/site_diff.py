# K1482 s5: per site, dark-ink pixels in A and B (RGB sum <= TH) in a (2R)^2 box, and the flips beyond 1 px of the other's ink.
# Writes a diff frame (white where ink flips, magenta where A-only, green where B-only) for tiles.py's third column.
#   python site_diff.py <a.png> <b.png> <sites.json> <diff.png> [min=3]   env R=18 TH=73
import json, os, sys
import numpy as np
from PIL import Image
a_p, b_p, s_p, d_p = sys.argv[1:5]; mn = int(sys.argv[5]) if len(sys.argv) > 5 else 3
R = int(os.environ.get("R", 18)); TH = int(os.environ.get("TH", 73))
A = np.asarray(Image.open(a_p).convert("RGB")).astype(int).sum(-1) <= TH
B = np.asarray(Image.open(b_p).convert("RGB")).astype(int).sum(-1) <= TH
def dil(x):
    y = x.copy(); y[1:] |= x[:-1]; y[:-1] |= x[1:]; y[:, 1:] |= x[:, :-1]; y[:, :-1] |= x[:, 1:]; return y
ao = A & ~dil(B); bo = B & ~dil(A)
D = np.full(A.shape + (3,), 14, np.uint8); D[A & B] = (60, 60, 60); D[ao] = (255, 14, 255); D[bo] = (14, 255, 14)
Image.fromarray(D).save(d_p)
S = json.load(open(s_p))["sites"]; rows = []
for s in S:
    cx, cy = round(s["x"]), round(s["y"]); sl = (slice(cy - R, cy + R), slice(cx - R, cx + R))
    rows.append((s["site"], int(A[sl].sum()), int(B[sl].sum()), int(ao[sl].sum()), int(bo[sl].sum())))
ch = [r for r in rows if r[3] + r[4] >= mn]
print(f"# sites {len(rows)}, changed (A-only + B-only >= {mn}): {len(ch)}; total A-only {sum(r[3] for r in rows)} B-only {sum(r[4] for r in rows)}")
for r in sorted(ch, key=lambda r: -(r[3] + r[4])): print(f"{r[0]:6s} inkA {r[1]:4d} inkB {r[2]:4d} Aonly {r[3]:4d} Bonly {r[4]:4d}")
