import sys, json
import numpy as np
from PIL import Image, ImageDraw
r = sys.argv[1]
T = np.asarray(Image.open(r + "/s8/m/today.png").convert("RGB")).astype(float)
G = np.asarray(Image.open(r + "/s8/m/gf.png").convert("RGB")).astype(float)
N = np.asarray(Image.open(r + "/s8/nogap/gf.png").convert("RGB")).astype(float)
X = {c["i"]: c for c in json.load(open(r + "/xpos9.json"))}
R = int(sys.argv[4]) if len(sys.argv) > 4 else 60
rows = []
for s in sys.argv[2].split(","):
    c = X[int(s)]; cx, cy = c["x"], c["y"]
    def crop(I):
        q = I[cy - R:cy + R, cx - R:cx + R]; lo, hi = np.percentile(q, 1), np.percentile(q, 99.5)
        q = np.clip((q - lo) / max(hi - lo, 1) * 255, 0, 255).copy(); q[R, R - 3:R + 4] = (255, 255, 0); q[R - 3:R + 4, R] = (255, 255, 0); return q
    sep = np.full((2 * R, 2, 3), 255.0)
    rows.append(np.concatenate([crop(T), sep, crop(G), sep, crop(N)], 1)); rows.append(np.full((2, rows[-1].shape[1], 3), 255.0))
im = Image.fromarray(np.concatenate(rows, 0).astype(np.uint8)); im = im.resize((im.width * 3, im.height * 3), Image.NEAREST); im.save(sys.argv[3]); print(im.size)
