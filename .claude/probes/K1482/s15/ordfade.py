# K1482 s15: the outline at ordinary crossings (no joint member on the over pass within 1.5 arc, k15log mA empty)
# at fade 0 and 1.2, tip vs the flag patched off (patch_flagoff.json; = master). Prints the summed ink change over
# every ordinary crossing's 48x48 box and the three crossings farthest from any site, as x:y for dsheet.py.
#   python ordfade.py <k15log.json> <sites_gf.json> <off dir> <tip dir>
import json, sys
import numpy as np
from PIL import Image
lg, sj, off, tip = sys.argv[1:5]
L = json.load(open(lg))
S = json.load(open(sj))["sites"]
I = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int)
ims = {v: (I(f"{off}/gf_fls{v}.png"), I(f"{tip}/gf_fls{v}.png")) for v in ("0", "1.2")}
# world -> pixel from the sites' own pairs (both axes share the scale)
w0, w1 = S[0], S[-1]
k = (w1["x"] - w0["x"]) / (w1["wx"] - w0["wx"])
bx, by = w0["x"] - k * w0["wx"], w0["y"] - k * w0["wy"]
ords = []
for e in L:
    if e["mA"]:
        continue
    px, py = e["x"] * k + bx, e["y"] * k + by
    if not (60 < px < 3140 and 60 < py < 1740):
        continue
    dj = min(np.hypot(s["x"] - px, s["y"] - py) for s in S)
    ords.append((dj, e["i"], px, py))
ords.sort(reverse=True)
print("ordinary crossings (no member within 1.5 arc):", len(ords))


def box(A, B, px, py):
    y0, x0 = int(py) - 24, int(px) - 24
    a, b = A[y0:y0 + 48, x0:x0 + 48], B[y0:y0 + 48, x0:x0 + 48]
    ia, ib = a.sum(2) <= 73, b.sum(2) <= 73
    return int((ia & ~ib).sum()), int((ib & ~ia).sum()), int(np.abs(a - b).max())


for v, (A, B) in ims.items():
    t = [box(A, B, px, py) for _, _, px, py in ords]
    print(f"fl {v}: summed ink lost {sum(x[0] for x in t)} gained {sum(x[1] for x in t)} over {len(t)} boxes; boxes with >= 10 px: {sum(1 for x in t if x[0] + x[1] >= 10)}")
for dj, i, px, py in ords[:3]:
    print(f"crossing {i} at ({px:.0f},{py:.0f}), {dj:.0f} px from the nearest site:", {v: box(A, B, px, py) for v, (A, B) in ims.items()})
print("xy", ",".join(f"{int(px)}:{int(py)}" for _, _, px, py in ords[:3]))
