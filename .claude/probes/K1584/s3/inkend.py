# K1584 s3: from a capture and its gapcheck json, where each under border's ink starts past the over thread's
# outline, read from the PIXELS (luminance along the border's centre line at gapcheck's points).
#   python inkend.py <captureDir> <gapcheck.json> [thr=70]
# Prints per path class a histogram of e_ink (world past the over outline where lum first drops below thr,
# e >= 0.02; 'open' = no ink by the walk's end, e 0.22).
import sys, json
import numpy as np
from PIL import Image
d, gj = sys.argv[1:3]; thr = float(sys.argv[3]) if len(sys.argv) > 3 else 70
q = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
L = (299 * q[:, :, 0] + 587 * q[:, :, 1] + 114 * q[:, :, 2]) / 1000
def lum(x, y):
    x0, y0 = int(np.floor(x)), int(np.floor(y)); fx, fy = x - x0, y - y0
    if x0 < 0 or y0 < 0 or x0 + 1 >= L.shape[1] or y0 + 1 >= L.shape[0]: return np.nan
    return (L[y0, x0] * (1 - fx) * (1 - fy) + L[y0, x0 + 1] * fx * (1 - fy) + L[y0 + 1, x0] * (1 - fx) * fy + L[y0 + 1, x0 + 1] * fx * fy)
G = json.load(open(gj))
out = []
for r in G['crossings']:
    for b in r['borders']:
        p = b['pts']; ei = None; emax = 0
        for j in range(0, len(p), 4):
            x, y, e = p[j], p[j + 1], p[j + 2]; emax = max(emax, e)
            if e < 0.02: continue
            v = lum(x - 0.5, y - 0.5)
            if v == v and v < thr: ei = e; break
        b['eInk'] = ei if ei is not None else (99 if emax > 0.2 else -1)
        out.append((r['i'], b['dir'], b['lat'], b['path'], b['eInk'], b['keepM']))
bins = [0.02, 0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.23, 100]
print('thr', thr, 'bins (e_ink <)', bins)
for cls in sorted(set(o[3] for o in out)):
    E = [o[4] for o in out if o[3] == cls]
    h = [sum(1 for e in E if (bins[k - 1] if k else -9) <= e < bins[k]) for k in range(len(bins))]
    print(f"{cls:7s} n={len(E):4d} hist={h} short(-1)={sum(1 for e in E if e == -1)}")
json.dump(G, open(gj.replace('.json', '_ink.json'), 'w'))
