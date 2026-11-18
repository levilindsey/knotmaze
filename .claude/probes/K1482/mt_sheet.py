# K1482 s3: mirror-only 4x sheet: per site, one column per mirror_tiles.ts json (the border look: ink dark over
# the coverage), then a diff of the last two (red = last adds ink, green = last removes).
#   python mt_sheet.py <out.png> <sites,...> <label=a.json> <label=b.json> ...
import sys, json
import numpy as np
from PIL import Image, ImageDraw
out, names = sys.argv[1], sys.argv[2].split(","); V = [a.split("=", 1) for a in sys.argv[3:]]
D = [(l, json.load(open(p))) for l, p in V]; S = 4
def img(t):
    R = t["R"]; n = 2 * R; px = np.array(t["px"])
    ink = px[:, 0].reshape(n, n); cov = px[:, 1].reshape(n, n)
    bg = np.array([20, 24, 34.]); fill = np.array([225, 190, 120.])
    b = bg + (fill - bg) * cov[..., None]; return b * (1 - ink[..., None]) + 25 * ink[..., None], ink
tiles = []
for nm in names:
    row = []; inks = []
    for l, d in D:
        if nm not in d: continue
        im, ink = img(d[nm]); row.append(im); inks.append(ink)
    a, b = inks[-2] > 0.5, inks[-1] > 0.5; df = np.full(a.shape + (3,), 235.)
    df[a & b] = 120; df[b & ~a] = [220, 40, 40]; df[a & ~b] = [40, 170, 40]; row.append(df)
    tiles.append((nm, row))
n = tiles[0][1][0].shape[0] * S; cols = len(tiles[0][1]); W = cols * (n + 6) + 6
im = Image.new("RGB", (W, len(tiles) * (n + 18) + 18), "white"); dr = ImageDraw.Draw(im)
dr.text((6, 2), "  |  ".join([l for l, _ in D] + ["diff last two: red adds, green removes"]), fill="black")
for r, (nm, row) in enumerate(tiles):
    y = 18 + r * (n + 18); dr.text((6, y), nm, fill="black")
    for c, t in enumerate(row):
        im.paste(Image.fromarray(t.clip(0, 255).astype(np.uint8)).resize((n, n), Image.NEAREST), (6 + c * (n + 6), y + 12))
im.save(out); print(out, im.size)
