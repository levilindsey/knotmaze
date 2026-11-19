# K1482 s8: 4x tiles per site, one column per frame (contrast-stretched colour), plus the ink diff of the last two
# (magenta = dark ink only in the second-to-last frame, green = only in the last, grey = both).
#   python sheet.py <sites.json> <out.png> <site,site,...> <label=frame.png> <label=frame.png> ... [env R=24 Z=4 TH=73 COLS=2]
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
sj, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
frames = [a.split("=", 1) for a in sys.argv[4:]]
R = int(os.environ.get("R", 24)); Z = int(os.environ.get("Z", 4)); TH = int(os.environ.get("TH", 73)); COLS = int(os.environ.get("COLS", 2))
S = {s["site"]: s for s in json.load(open(sj))["sites"]}
ims = [np.asarray(Image.open(p).convert("RGB")).astype(int) for _, p in frames]
def dil(x):
    y = x.copy(); y[1:] |= x[:-1]; y[:-1] |= x[1:]; y[:, 1:] |= x[:, :-1]; y[:, :-1] |= x[:, 1:]; return y
tiles = []
for n in names:
    s = S[n]; cx, cy = round(s["x"]), round(s["y"]); sl = (slice(cy - R, cy + R), slice(cx - R, cx + R))
    cols = []
    for im in ims:
        c = im[sl].astype(float); lo, hi = np.percentile(c, 1), np.percentile(c, 99.5)
        cols.append(np.clip((c - lo) / max(hi - lo, 1) * 255, 0, 255))
    if len(ims) >= 2:
        A = ims[-2][sl].sum(-1) <= TH; B = ims[-1][sl].sum(-1) <= TH
        D = np.full(A.shape + (3,), 0.0); D[A & B] = 90; D[A & ~dil(B)] = (255, 0, 255); D[B & ~dil(A)] = (0, 230, 0)
        D[A & ~B & dil(B)] = (120, 40, 120); D[B & ~A & dil(A)] = (40, 120, 40)
        cols.append(D)
    sep = np.full((2 * R, 1, 3), 255.0)
    row = np.concatenate(sum([[c, sep] for c in cols], [])[:-1], 1).astype(np.uint8)
    tiles.append((n, Image.fromarray(row).resize((row.shape[1] * Z, 2 * R * Z), Image.NEAREST)))
W = tiles[0][1].width; H = tiles[0][1].height + 14; rows = (len(tiles) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * (W + 10), rows * H + 14), "white"); d = ImageDraw.Draw(sheet)
d.text((2, 1), " | ".join(l for l, _ in frames) + (" | diff (magenta: %s only, green: %s only)" % (frames[-2][0], frames[-1][0]) if len(frames) >= 2 else ""), fill=(0, 0, 0))
for i, (n, T) in enumerate(tiles):
    x = (i % COLS) * (W + 10); y = 14 + (i // COLS) * H
    d.text((x + 2, y), n, fill=(200, 0, 0)); sheet.paste(T, (x, y + 14))
sheet.save(out); print(len(tiles), "tiles ->", out)
