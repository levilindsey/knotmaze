# K1482 s9: per crossing, the pixels gf's gap removes (nogap ink with no gf ink within 1 px, R px around the
# crossing) and how many of them today's renderer covers with a stroke (today's border strokes are coloured over a
# blue ground: R - B > DT). Prints one line per crossing: removed, today-covered, fraction, then the xpos9 fields.
#   python todaycov.py <xpos9.json> <gf.png> <nogap.png> <today.png> [x,...]  [env R=20 TH=73 DT=-30]
import json, os, sys
import numpy as np
from PIL import Image
xp, gp, np_, tp = sys.argv[1:5]
only = set(int(v) for v in sys.argv[5].split(",")) if len(sys.argv) > 5 else None
R = int(os.environ.get("R", 20)); TH = int(os.environ.get("TH", 73)); DT = int(os.environ.get("DT", -30))
X = json.load(open(xp))
ink = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int).sum(-1) <= TH
G = ink(gp); N = ink(np_); T = np.asarray(Image.open(tp).convert("RGB")).astype(int)
S = T[..., 0] - T[..., 2] > DT
def dil(a):
    b = a.copy(); b[1:] |= a[:-1]; b[:-1] |= a[1:]; c = b.copy(); c[:, 1:] |= b[:, :-1]; c[:, :-1] |= b[:, 1:]; return c
GD = dil(G); SD = S if os.environ.get("NOD") else dil(S)
for c in X:
    if only is not None and c["i"] not in only: continue
    cx, cy = c["x"], c["y"]
    box = (slice(cy - R, cy + R), slice(cx - R, cx + R))
    rm = N[box] & ~GD[box]; n = int(rm.sum()); k = int((rm & SD[box]).sum())
    print(f"x{c['i']} rm {n} todayCov {k} f {k / n if n else 0:.2f} jo {c['jo']} ju {c['ju']} site {c['site']} sd {c['sd']}")
