# K1584 s12: crops of gf_b2.png captures at one place, scaled, with geo12.ts's geometry drawn over (chain centrelines
# and their +-h borders, sample indices every 5, joint corners, crossings).
#   python ov12.py <geo.json> <out.png> <h_px> <label=png> [<label=png> ...] [--half 20] [--scale 14] [--chains 59,84]
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
def opt(n, d):
    if n in args:
        i = args.index(n); v = args[i + 1]; del args[i:i + 2]; return v
    return d
half = int(opt("--half", "20")); sc = int(opt("--scale", "14")); only = opt("--chains", None)
only = set(int(c) for c in only.split(",")) if only else None
geo = json.load(open(args[0])); out = args[1]; hpx = float(args[2]); pics = [a.split("=", 1) for a in args[3:]]
X, Y = round(geo["X"]), round(geo["Y"]); x0, y0 = X - half, Y - half; W = 2 * half * sc
cols = [(255, 80, 80), (80, 200, 255), (120, 255, 120), (255, 200, 60), (230, 120, 255), (255, 255, 255)]
chains = {}
for c, k, arc, x, y in geo["samples"]:
    chains.setdefault(c, []).append((k, x, y))
try: font = ImageFont.truetype("arial.ttf", 13)
except Exception: font = ImageFont.load_default()
tiles = []
for lab, p in pics:
    a = np.asarray(Image.open(p).convert("RGB")).astype(np.float32)
    crop = a[y0:y0 + 2 * half, x0:x0 + 2 * half]
    g = np.clip((crop - 18) / 24 * 255, 0, 255).astype(np.uint8)
    im = Image.fromarray(g).resize((W, W), Image.NEAREST); d = ImageDraw.Draw(im)
    P = lambda x, y: ((x - x0) * sc, (y - y0) * sc)
    for i, (c, pts) in enumerate(sorted(chains.items())):
        if only and c not in only: continue
        col = cols[i % len(cols)]; pts.sort()
        # split runs at index gaps
        runs, cur = [], [pts[0]]
        for q in pts[1:]:
            if q[0] != cur[-1][0] + 1: runs.append(cur); cur = []
            cur.append(q)
        runs.append(cur)
        for r in runs:
            xy = [P(x + 0.0, y + 0.0) for _, x, y in r]
            if len(xy) > 1: d.line(xy, fill=col, width=1)
            for j in range(len(r)):
                k, x, y = r[j]
                if len(r) > 1:
                    jn = min(j + 1, len(r) - 1); jp = max(j - 1, 0)
                    tx, ty = r[jn][1] - r[jp][1], r[jn][2] - r[jp][2]; n = (tx * tx + ty * ty) ** 0.5 or 1
                    nx, ny = -ty / n, tx / n
                    for s in (-1, 1): d.point(P(x + s * hpx * nx, y + s * hpx * ny), fill=col)
                if k % 5 == 0: d.text(P(x, y), f"{c}:{k}", fill=col, font=font)
    for k in geo["corners"]:
        cx, cy = P(k["x"], k["y"]); r = (k["Rpx"]) * sc
        d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], outline=(255, 255, 0))
        d.text((cx + 5, cy), f"k{k['k']}", fill=(255, 255, 0), font=font)
    for x in geo["crossings"]:
        cx, cy = P(x["x"], x["y"]); d.rectangle([cx - 5, cy - 5, cx + 5, cy + 5], outline=(255, 0, 255))
    d.text((4, 4), lab, fill=(255, 255, 0), font=font)
    tiles.append(im)
sheet = Image.new("RGB", (len(tiles) * (W + 8), W), (40, 40, 40))
for i, t in enumerate(tiles): sheet.paste(t, (i * (W + 8), 0))
sheet.save(out); print(out, sheet.size)
