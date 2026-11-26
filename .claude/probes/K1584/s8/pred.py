# K1584 s8: a predicted capture of a mirror variant, for viewing its changed places before any src change.
# Starts from stage 7's capture (s7/out/s7a/<maze>/gf_b2.png) and, at each pixel pxwhy.ts lists (GF_SRCP mode: column
# 0 = the variant, column 2 = s7), moves it toward today's capture by the share of s7's cut the variant takes back:
#   pred = s7 + (today - s7) * clip((cut_s7 - cut_var) / cut_s7, 0, 1)
# (the geometry is pinned, so today's pixel is the uncut border wherever today has no gap there). Only right for a
# variant that only removes cuts (pxdiff inkMore 0); pixels the variant cuts more are reported, not drawn.
#   python pred.py <maze> <out dir> <pxwhy out> ...   -> <out dir>/<maze>/gf_b2.png
import sys, json, os
import numpy as np
from PIL import Image
K = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
m, od, fs = sys.argv[1], sys.argv[2], sys.argv[3:]
s7 = np.asarray(Image.open(os.path.join(K, 's7', 'out', 's7a', m, 'gf_b2.png')).convert('RGB')).astype(np.float32)
td = np.asarray(Image.open(os.path.join(K, 's1', 'out', 'before', m, 'gf_b2.png')).convert('RGB')).astype(np.float32)
P = s7.copy(); n = more = 0
for f in fs:
    for l in open(f):
        if not l.startswith('{"X'): continue
        d = json.loads(l); cv, c7 = d['g'][0][0], d['g'][2][0]
        if cv > c7 + 0.02: more += 1; continue
        if c7 <= 0 or c7 - cv < 0.02: continue
        w = min(1.0, max(0.0, (c7 - cv) / c7)); X, Y = d['X'], d['Y']
        P[Y, X] = s7[Y, X] + (td[Y, X] - s7[Y, X]) * w; n += 1
os.makedirs(os.path.join(od, m), exist_ok=True)
Image.fromarray(np.clip(P, 0, 255).astype(np.uint8), 'RGB').save(os.path.join(od, m, 'gf_b2.png'))
print(m, 'moved', n, 'cut more (not drawn)', more)
