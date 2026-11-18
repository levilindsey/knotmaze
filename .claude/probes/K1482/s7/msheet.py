# K1482 s7: per site, screen (stretched) | mirror A | mirror B | diff (red = lost in B, green = gained), 5x.
#   python msheet.py <frame.png> <sites.json> <A.json> <B.json> <out.png> <sites|top:N> [R=24]
import json, sys
import numpy as np
from PIL import Image, ImageDraw
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(float); S = {s["site"]: s for s in json.load(open(sys.argv[2]))["sites"]}
A = json.load(open(sys.argv[3])); B = json.load(open(sys.argv[4])); Z = 5
names = sys.argv[6].split(",")
if names[0].startswith("top:"):
    n = int(names[0][4:]); sc = []
    for k in A:
        a = np.array([p[0] >= 0.5 for p in A[k]["px"]]); b = np.array([p[0] >= 0.5 for p in B[k]["px"]]); d = int((a != b).sum())
        if d: sc.append((d, k))
    names = [k for d, k in sorted(sc, reverse=True)[:n]]
tiles = []
for nm in names:
    t = A[nm]; R = t["R"]; n = 2 * R; cx, cy = t["cx"], t["cy"]
    C = im[cy - R:cy + R, cx - R:cx + R].sum(2); L = np.clip((C - 60) / (110 - 60), 0, 1); g = np.stack([L] * 3, 2) * 255
    def ink(M): return np.array([p[0] for p in M[nm]["px"]]).reshape(n, n)
    a = ink(A); b = ink(B)
    ta = np.stack([1 - a] * 3, 2) * 255; tb = np.stack([1 - b] * 3, 2) * 255
    df = np.full((n, n, 3), 235.0); df[(a >= 0.5) & (b >= 0.5)] = 90; df[(a >= 0.5) & (b < 0.5)] = (230, 30, 30); df[(a < 0.5) & (b >= 0.5)] = (30, 180, 30)
    sep = np.full((n, 2, 3), 255.0)
    T = np.concatenate([g, sep, ta, sep, tb, sep, df], 1).astype(np.uint8)
    tiles.append((nm, Image.fromarray(T).resize((T.shape[1] * Z, n * Z), Image.NEAREST)))
W = tiles[0][1].width; H = tiles[0][1].height + 14; cols = 2; rows = (len(tiles) + cols - 1) // cols
out = Image.new("RGB", (cols * (W + 10), rows * H), "white"); d = ImageDraw.Draw(out)
for i, (nm, T) in enumerate(tiles):
    x = (i % cols) * (W + 10); y = (i // cols) * H; d.text((x, y), nm, fill=(200, 0, 0)); out.paste(T, (x, y + 14))
out.save(sys.argv[5]); print(len(tiles), "tiles:", ",".join(names))
