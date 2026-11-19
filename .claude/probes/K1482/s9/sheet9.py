# K1482 s9: 4x tiles per site, one column per frame, each frame with ITS OWN sites file (today's view differs from gf's:
# cap.mjs drops gfh=1 for today), plus the ink diff of the last two frames (magenta = dark ink only in the second-to-last,
# green = only in the last, grey = both).
#   python sheet9.py <out.png> <site[:dx:dy],...> <label=frame.png@sites.json> ... [env R=24 Z=4 TH=73 COLS=2 NODIFF=1]
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
out, names = sys.argv[1], sys.argv[2].split(",")
frames = []
for a in sys.argv[3:]:
    lab, rest = a.split("=", 1); fp, sp = rest.split("@", 1)
    frames.append((lab, np.asarray(Image.open(fp).convert("RGB")).astype(int), {s["site"]: s for s in json.load(open(sp))["sites"]}))
R = int(os.environ.get("R", 24)); Z = int(os.environ.get("Z", 4)); TH = int(os.environ.get("TH", 73)); COLS = int(os.environ.get("COLS", 2))
def dil(x):
    y = x.copy(); y[1:] |= x[:-1]; y[:-1] |= x[1:]; y[:, 1:] |= x[:, :-1]; y[:, :-1] |= x[:, 1:]; return y
tiles = []
for nm in names:
    p = nm.split(":"); n = p[0]; dx = int(p[1]) if len(p) > 1 else 0; dy = int(p[2]) if len(p) > 2 else 0
    cols = []; crops = []
    for lab, im, S in frames:
        s = S[n]; cx, cy = round(s["x"]) + dx, round(s["y"]) + dy
        c = im[cy - R:cy + R, cx - R:cx + R].astype(float); crops.append(im[cy - R:cy + R, cx - R:cx + R])
        lo, hi = np.percentile(c, 1), np.percentile(c, 99.5)
        cols.append(np.clip((c - lo) / max(hi - lo, 1) * 255, 0, 255))
    if len(frames) >= 2 and not os.environ.get("NODIFF"):
        A = crops[-2].sum(-1) <= TH; B = crops[-1].sum(-1) <= TH
        D = np.full(A.shape + (3,), 0.0); D[A & B] = 90; D[A & ~dil(B)] = (255, 0, 255); D[B & ~dil(A)] = (0, 230, 0)
        D[A & ~B & dil(B)] = (120, 40, 120); D[B & ~A & dil(A)] = (40, 120, 40)
        cols.append(D)
    sep = np.full((2 * R, 1, 3), 255.0)
    row = np.concatenate(sum([[c, sep] for c in cols], [])[:-1], 1).astype(np.uint8)
    tiles.append((nm, Image.fromarray(row).resize((row.shape[1] * Z, 2 * R * Z), Image.NEAREST)))
W = tiles[0][1].width; H = tiles[0][1].height + 14; rows = (len(tiles) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * (W + 10), rows * H + 14), "white"); d = ImageDraw.Draw(sheet)
d.text((2, 1), " | ".join(f[0] for f in frames) + ("" if os.environ.get("NODIFF") or len(frames) < 2 else " | diff (magenta: %s only, green: %s only)" % (frames[-2][0], frames[-1][0])), fill=(0, 0, 0))
for i, (n, T) in enumerate(tiles):
    x = (i % COLS) * (W + 10); y = 14 + (i // COLS) * H
    d.text((x + 2, y), n, fill=(200, 0, 0)); sheet.paste(T, (x, y + 14))
sheet.save(out); print(len(tiles), "tiles ->", out)
