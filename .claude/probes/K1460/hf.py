# K1460 s2, Done 1's second number: fine bands in a box around a site (works where bands.mjs's per-crossing walk
# cannot, e.g. jB's self-crossing loop). Mask = pixels of today's fl=0 frame that are thread (not background) with
# every pixel within R device px also thread (the ribbon's interior at fade 0), restricted to pixels the fade
# changes in today's frame (|L_today(fl) - L_today(0)| > 6: the faded span). Score = mean |L - box3(L)| over the
# mask (L = luminance 0..255): a smooth ramp scores near today's, radial bands and stairs score above it.
#   python hf.py <dir> <fl> <half css> "<x,y;...>" today ma br ...
import sys
import numpy as np
from PIL import Image
d, fl, half, sites = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
modes = sys.argv[5:]
DSF, R = 2, 3
L = lambda k, f: np.asarray(Image.open(f"{d}/shot_{k}_{f}.png").convert("RGB"), dtype=np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
ref0 = np.asarray(Image.open(f"{d}/shot_{modes[0]}_0.png").convert("RGB"), dtype=np.int32)
flat = (ref0[..., 0] << 16) | (ref0[..., 1] << 8) | ref0[..., 2]
vals, cnt = np.unique(flat[::7, ::7], return_counts=True)
bk = vals[cnt.argmax()]
bg = np.array([bk >> 16, (bk >> 8) & 255, bk & 255])
thread = np.abs(ref0 - bg).sum(-1) > 40
inner = thread.copy()
for dy in range(-R, R + 1):
    for dx in range(-R, R + 1):
        inner &= np.roll(np.roll(thread, dy, 0), dx, 1)
T0, T = L(modes[0], "0"), L(modes[0], fl)
mask = inner & (np.abs(T - T0) > 6)
def box3(a):
    s = np.zeros_like(a)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            s += np.roll(np.roll(a, dy, 0), dx, 1)
    return s / 9
imgs = {k: L(k, fl) for k in modes}
hf = {k: np.abs(v - box3(v)) for k, v in imgs.items()}
for s in sites.split(";"):
    x, y = (int(float(t) * DSF) for t in s.split(","))
    h = half * DSF
    m = mask[y - h:y + h, x - h:x + h]
    n = int(m.sum())
    out = [f"{k} {hf[k][y - h:y + h, x - h:x + h][m].mean():.3f}" if n else f"{k} -" for k in modes]
    print(f"site {s} fl={fl} box {2 * half} css, {n} px: " + " | ".join(out))
