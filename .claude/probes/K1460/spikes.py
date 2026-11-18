# K1460: gf-only one-pixel spikes (the dotted line across a faded under thread), beside fade.mjs.
#   python .claude/probes/K1460/spikes.py <today.png> <gf.png> [max=N] [out.png]
# A pixel is a spike when gf differs from its own four neighbours' mean by > 24 (max channel), from today's pixel
# by > 24, and today's pixel is smooth there (within 8 of its own neighbours' mean). Both shots must be one frozen
# state (shot.mjs / fade.mjs with HASH). Prints the count and the densest 16x16 css cells; exit 1 when count > max.
import sys
from PIL import Image
import numpy as np
t = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.int32)
g = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(np.int32)
mx = int(sys.argv[3]) if len(sys.argv) > 3 else 40
def m4(a):
    p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
    return (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4.0
gs = np.abs(g - m4(g)).max(axis=2)
ts = np.abs(t - m4(t)).max(axis=2)
gt = np.abs(g - t).max(axis=2)
from numpy.lib.stride_tricks import sliding_window_view as swv
tsw = swv(np.pad(ts, 3, mode='edge'), (7, 7)).max(axis=(2, 3))  # today smooth over 7x7: no edge of today's nearby
s = (gs > 24) & (gt > 24) & (tsw < 6)
s[:4, :] = False; s[-4:, :] = False; s[:, :4] = False; s[:, -4:] = False
n = int(s.sum())
ys, xs = np.where(s)
cells = {}
for y, x in zip(ys, xs):
    k = (x // 32, y // 32); cells[k] = cells.get(k, 0) + 1
top = sorted(cells.items(), key=lambda kv: -kv[1])[:12]
print(f"spikes {n} (max {mx}) " + " ".join(f"{k[0]*16+8},{k[1]*16+8}:{v}" for k, v in top))
if len(sys.argv) > 4:
    o = (g * 0.35).astype(np.uint8); o[s] = [255, 255, 0]
    Image.fromarray(o).save(sys.argv[4])
sys.exit(1 if n > mx else 0)
