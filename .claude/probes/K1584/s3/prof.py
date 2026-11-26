# K1584 s3: print the luminance profile along a few borders' gapcheck points.  python prof.py <cap> <gj> i[,i..]
import sys, json
import numpy as np
from PIL import Image
d, gj, ids = sys.argv[1], sys.argv[2], [int(s) for s in sys.argv[3].split(',')]
q = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
L = (299 * q[:, :, 0] + 587 * q[:, :, 1] + 114 * q[:, :, 2]) / 1000
def lum(x, y):
    x0, y0 = int(np.floor(x)), int(np.floor(y)); fx, fy = x - x0, y - y0
    return (L[y0, x0] * (1 - fx) * (1 - fy) + L[y0, x0 + 1] * fx * (1 - fy) + L[y0 + 1, x0] * (1 - fx) * fy + L[y0 + 1, x0 + 1] * fx * fy)
G = json.load(open(gj))
for r in G['crossings']:
    if r['i'] not in ids: continue
    for b in r['borders']:
        p = b['pts']
        s = ' '.join(f"{p[j+2]:.2f}:{lum(p[j]-0.5,p[j+1]-0.5):.0f}/{p[j+3]:.1f}" for j in range(0, len(p), 4))
        print(r['i'], b['dir'], b['lat'], b['path'], s[:400])
