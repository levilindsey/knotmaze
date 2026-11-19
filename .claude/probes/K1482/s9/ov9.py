# K1482 s9: today's outline (bg=none&cs=mono frame, |T - bg| > 12) over master gf's ink (sum <= 73), per site, 80 px boxes x3:
# grey = gf ink only, magenta = today outline only (gf lacks it), green = both. Frames must be one state (same hash, toDevA).
#   python ov9.py <raw dir with tbn/ and s8/m/> <site,...> <out.png>
import json, sys
import numpy as np
from PIL import Image
r = sys.argv[1]
T = np.asarray(Image.open(r + "/tbn/today.png").convert("RGB")).astype(int)
G = np.asarray(Image.open(r + "/s8/m/gf.png").convert("RGB")).astype(int).sum(-1) <= 73
TI = np.abs(T - np.array([21, 27, 40])).sum(-1) > 12
S = {s["site"]: s for s in json.load(open(r + "/s8/m/sites_gf.json"))["sites"]}
R = 40; tiles = []
for n in sys.argv[2].split(","):
    x, y = int(round(S[n]["x"])), int(round(S[n]["y"]))
    g, t = G[y - R:y + R, x - R:x + R], TI[y - R:y + R, x - R:x + R]
    im = np.full(g.shape + (3,), 255, np.uint8); im[g] = (90, 90, 90); im[t & ~g] = (230, 0, 200); im[t & g] = (0, 160, 0)
    tiles.append(im); tiles.append(np.full((2 * R, 2, 3), 0, np.uint8))
Image.fromarray(np.concatenate(tiles, 1)).resize((len(tiles) // 2 * (2 * R + 2) * 3, 2 * R * 3), Image.NEAREST).save(sys.argv[3])
