# K1482 s4: per site, GPU ink the mirror lacks (extra) and mirror ink the GPU lacks (miss), in the tile.
#   python gm_count.py <frame.png> <mir.json> [inkSum=82]
# The frame's tones are all dark (ink ~ (18,20,27), fill/page ~ (22-33,26-33,38-50)): ink = RGB sum <= inkSum.
# Mirror ink = px[0] >= 0.5. Counts within 1 px of the other's ink are ignored (AA edges).
import json, sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int).sum(-1)
M = json.load(open(sys.argv[2])); th = int(sys.argv[3]) if len(sys.argv) > 3 else 82
def dil(a):
    b = a.copy(); b[1:] |= a[:-1]; b[:-1] |= a[1:]; b[:, 1:] |= a[:, :-1]; b[:, :-1] |= a[:, 1:]; return b
rows = []
for nm, m in M.items():
    R = m["R"]; P = np.array(m["px"], dtype=float).reshape(2 * R, 2 * R, 6); cx, cy = m["cx"], m["cy"]
    g = im[cy - R:cy + R, cx - R:cx + R] <= th; mi = P[..., 0] >= 0.5
    rows.append((nm, int((g & ~dil(mi)).sum()), int((mi & ~dil(g)).sum())))
for nm, e, s in sorted(rows, key=lambda r: -(r[1] + r[2])): print(f"{nm:6s} extra {e:4d} miss {s:4d}")
