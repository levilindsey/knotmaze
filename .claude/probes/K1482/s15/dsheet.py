# K1482 s15: master | candidate | diff tiles of named sites at Z x (diff: the candidate greyed, ink it gained green,
# ink it lost red; ink = RGB sum <= 73), 6 rows a sheet.
#   python dsheet.py <out prefix> <sites.json> <master.png> <cand.png> <site,site,...> [R 24] [Z 5]
import sys, json
import numpy as np
from PIL import Image, ImageDraw
pre, sj, mp, cp, names = sys.argv[1:6]
R = int(sys.argv[6]) if len(sys.argv) > 6 else 24
Z = int(sys.argv[7]) if len(sys.argv) > 7 else 5
S = {s["site"]: s for s in json.load(open(sj))["sites"]}
M = np.asarray(Image.open(mp).convert("RGB")).astype(np.int32)
C = np.asarray(Image.open(cp).convert("RGB")).astype(np.int32)
mi, ci = M.sum(2) <= 73, C.sum(2) <= 73
names = [n for n in names.split(",") if n]
W = 2 * R * Z
for s0 in range(0, len(names), 6):
    chunk = names[s0:s0 + 6]
    sheet = Image.new("RGB", (3 * (W + 6) + 6, len(chunk) * (W + 18)), "white")
    d = ImageDraw.Draw(sheet)
    for r, nm in enumerate(chunk):
        cx, cy = (int(v) for v in nm.split(":")) if ":" in nm else (int(round(S[nm]["x"])), int(round(S[nm]["y"])))
        y0, x0 = max(0, cy - R), max(0, cx - R)
        sl = (slice(y0, y0 + 2 * R), slice(x0, x0 + 2 * R))
        g = C[sl].mean(2, keepdims=True).repeat(3, 2) * 0.5 + 64
        g[ci[sl] & ~mi[sl]] = (0, 230, 0)
        g[mi[sl] & ~ci[sl]] = (255, 0, 0)
        g[ci[sl] & mi[sl]] = (20, 20, 40)
        gain, loss = int((ci[sl] & ~mi[sl]).sum()), int((mi[sl] & ~ci[sl]).sum())
        lo, hi = np.percentile(M[sl], 1), np.percentile(M[sl], 99.5)
        st = lambda a: (a - lo) * 255.0 / max(1.0, hi - lo)
        for k, a in enumerate((st(M[sl]), st(C[sl]), g)):
            im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((W, W), Image.NEAREST)
            sheet.paste(im, (6 + k * (W + 6), r * (W + 18) + 14))
        d.text((6, r * (W + 18)), f"{nm} ({cx},{cy})  master | cand | diff  +{gain} -{loss}", fill=(0, 0, 0))
    sheet.save(f"{pre}_{s0 // 6 + 1}.png")
print("sheets:", (len(names) + 5) // 6)
