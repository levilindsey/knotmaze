# K1482 s9: the step 2 count, per site: outline ink TODAY draws (bg=none&cs=mono frame, |T - bg| > TH) with no gf ink
# (sum <= 73) within D px, in a box of R px around the site. Same physics hash and toDevA required (both sites files).
#   python miss9.py <today.png> <sites_today.json> <gf.png> <sites_gf.json> [env R=24 D=3 TH=12 SITES=a,b,...]
# Prints per site the missing count; the 12 cause-B sites are starred; ends with the class means and the clean spread.
import json, os, sys
import numpy as np
from PIL import Image
tp, ts, gp, gs = sys.argv[1:5]
R = int(os.environ.get("R", 24)); D = int(os.environ.get("D", 3)); TH = int(os.environ.get("TH", 12))
B = ["j49", "j55", "j87", "j36", "t79s", "j22", "j29", "t65s", "t80s", "t81s", "t70s", "j88"]
St, Sg = json.load(open(ts)), json.load(open(gs))
assert St["hash"] == Sg["hash"] and np.allclose(St["toDevA"], Sg["toDevA"]), "not one state"
T = np.asarray(Image.open(tp).convert("RGB")).astype(int)
vals, cnt = np.unique(T.reshape(-1, 3)[::97], axis=0, return_counts=True); bg = vals[cnt.argmax()]
TI = np.abs(T - bg).sum(-1) > TH
G = np.asarray(Image.open(gp).convert("RGB")).astype(int).sum(-1) <= 73
GD = G.copy()
for _ in range(D):
    b = GD.copy(); b[1:] |= GD[:-1]; b[:-1] |= GD[1:]; GD = b.copy(); GD[:, 1:] |= b[:, :-1]; GD[:, :-1] |= b[:, 1:]
miss = TI & ~GD
want = os.environ.get("SITES")
rows = []
for s in Sg["sites"]:
    if want and s["site"] not in want.split(","): continue
    x, y = int(round(s["x"])), int(round(s["y"]))
    if x < R or y < R or x + R >= G.shape[1] or y + R >= G.shape[0]: continue
    m = int(miss[y - R:y + R, x - R:x + R].sum()); t = int(TI[y - R:y + R, x - R:x + R].sum())
    rows.append((m, s["site"], t))
for m, n, t in sorted(rows, reverse=True)[:60]:
    print(f"{'*' if n in B else ' '} {n:6s} missing {m:4d} of today {t:4d}")
bm = [m for m, n, t in rows if n in B]; om = sorted(m for m, n, t in rows if n not in B)
print(f"bg {bg.tolist()} TH {TH} D {D} R {R}: cause-B mean {np.mean(bm):.1f} (n {len(bm)}); others median {om[len(om) // 2]} p90 {om[int(len(om) * 0.9)]} (n {len(om)})")
