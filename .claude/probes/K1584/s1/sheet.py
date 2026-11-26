# K1584 s1: a before|after sheet of crops. Each tile: before (left) and after (right) of a w x w device px box,
# contrast-stretched, scaled; label = name. Places from a json list [{"name":..,"x":..,"y":..}, ...] (device px).
#   python sheet.py <beforeDir> <afterDir> <places.json> <out.png> [w=72] [scale=4] [cols=4]
import sys, json
import numpy as np
from PIL import Image, ImageDraw
b, a, pl, out = sys.argv[1:5]
w = int(sys.argv[5]) if len(sys.argv) > 5 else 72
sc = int(sys.argv[6]) if len(sys.argv) > 6 else 4
cols = int(sys.argv[7]) if len(sys.argv) > 7 else 4
P = json.load(open(pl))
def load(d):
    x = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
    return (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
B, A = load(b), load(a)
lo, hi = np.percentile(B, 1), np.percentile(B, 99.5)
def tile(L, x, y):
    x0 = int(max(0, min(L.shape[1] - w, x - w / 2))); y0 = int(max(0, min(L.shape[0] - w, y - w / 2)))
    v = np.clip((L[y0:y0 + w, x0:x0 + w] - lo) / (hi - lo), 0, 1)
    return Image.fromarray((v * 255).astype(np.uint8), 'L').resize((w * sc, w * sc), Image.NEAREST)
tw, th = 2 * w * sc + 6, w * sc + 18
rows = (len(P) + cols - 1) // cols
S = Image.new('RGB', (cols * (tw + 8), rows * (th + 6)), (40, 0, 60))
dr = ImageDraw.Draw(S)
for i, p in enumerate(P):
    ox, oy = (i % cols) * (tw + 8), (i // cols) * (th + 6)
    S.paste(tile(B, p['x'], p['y']), (ox, oy + 16)); S.paste(tile(A, p['x'], p['y']), (ox + w * sc + 6, oy + 16))
    dr.text((ox + 2, oy + 2), f"{p['name']}  before | after", fill=(255, 255, 0))
S.save(out); print(out, S.size, len(P), 'lum', lo, hi)
