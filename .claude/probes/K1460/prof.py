# K1460 s5: junction B's fade profile against today's. Samples each shot along loopgeo.mjs's centreline (and lateral
# lines at -0.4h..+0.4h), luminance normalised by the shot's own bright level (the 95th percentile of the stations
# between EXCL and loopLen - EXCL). Per shot: dev = the largest |shot - today| of the normalised profiles (a fade
# that ends early or hard reads high), peak = the largest bright thin line (a station brighter than the darker
# neighbourhood's... the brighter of the two neighbourhoods' darkest, W stations each side), both /1 (normalised).
# Writes <plot.png>: the centreline profiles over arc.
#
#   python prof.py <geo.json> <EXCL> <plot.png> <today png> <png>[=label] ...      env W=5
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
geo = json.load(open(sys.argv[1])); excl = float(sys.argv[2]); plot = sys.argv[3]
prof = np.array(geo["prof"]); h = geo["hDev"]; W = int(os.environ.get("W", "5"))
OFFS = (0.0, -0.4, -0.2, 0.2, 0.4)
da = prof[:, 0]; keep = (da > excl) & (da < geo["loopLen"] - excl)
def bil(img, x, y):
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    return img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy
def lp(img, off):
    L = bil(img, prof[:, 1] + prof[:, 3] * off * h, prof[:, 2] + prof[:, 4] * off * h)
    return L / max(np.percentile(L[keep], 95), 1)
def peaks(L):
    p = np.zeros(len(L))
    for i in range(W, len(L) - W): p[i] = L[i] - max(L[i - W:i].min(), L[i + 1:i + 1 + W].min())
    return p
load = lambda p: np.asarray(Image.open(p).convert("L")).astype(float)
ref = load(sys.argv[4]); R = {o: lp(ref, o) for o in OFFS}
shots = [("today", ref)] + [((a.partition("=")[2] or a), load(a.partition("=")[0])) for a in sys.argv[5:]]
print(f"crossing {geo['ci']} loop {geo['loopLen']:.3f} world, h {h:.1f} dev px, excl {excl}, W {W}")
cols = [(240, 240, 240), (255, 120, 120), (120, 220, 120), (120, 160, 255), (255, 220, 90)]
Wd, Hd = 900, 300; im = Image.new("RGB", (Wd, Hd + 20), (20, 20, 28)); dr = ImageDraw.Draw(im)
idx = np.where(keep)[0]; a0, a1 = da[idx[0]], da[idx[-1]]
for k, (lab, img) in enumerate(shots):
    rows = []
    for o in OFFS:
        L = lp(img, o); d = np.abs(L - R[o]); d[~keep] = 0; pk = peaks(L); pr = peaks(R[o]); pk = np.where(keep, pk - np.maximum(pr, 0), 0)
        i, j = int(np.argmax(d)), int(np.argmax(pk)); rows.append((d[i], da[i], pk[j], da[j], o))
    bd = max(rows); bp = max(rows, key=lambda r: r[2])
    print(f"{lab:>12}: dev {bd[0]:.3f} at {bd[1]:+.2f} ({bd[4]:+.1f}h)  peak {bp[2]:.3f} at {bp[3]:+.2f} ({bp[4]:+.1f}h)   " + "  ".join(f"{r[4]:+.1f}h d{r[0]:.2f}@{r[1]:.2f} p{r[2]:.3f}@{r[3]:.2f}" for r in rows))
    L = lp(img, 0.0); pts = [((da[i] - a0) / (a1 - a0) * Wd, Hd - min(L[i], 1.3) / 1.3 * Hd) for i in idx]
    dr.line(pts, fill=cols[k % len(cols)], width=1); dr.text((6 + 90 * k, Hd + 4), lab, fill=cols[k % len(cols)])
im.save(plot)
