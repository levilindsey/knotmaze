# K1482 s3: ring_ink.ts's json -> a sheet: per variant, the border look (ink dark on the fill's light) and the chain
# label map (one hue per chain over the coverage). python ring_ink.py <in.json> <out.png> [scale=3]
import json, sys, colorsys
import numpy as np
from PIL import Image
D = json.load(open(sys.argv[1])); n = D['n']; S = int(sys.argv[3]) if len(sys.argv) > 3 else 3
cols = []
for nm, v in D['v'].items():
    ink = np.array(v['ink']).reshape(n, n); cov = np.array(v['cov']).reshape(n, n); ch = np.array(v['ch']).reshape(n, n)
    bg = np.array([20, 24, 34.]); fill = np.array([225, 150, 225.])
    b = bg + (fill - bg) * cov[..., None]; b = b * (1 - ink[..., None]) + np.array([30, 30, 30.]) * ink[..., None]
    hue = np.zeros((n, n, 3))
    for c in np.unique(ch):
        if c < 0: continue
        r, g, bb = colorsys.hsv_to_rgb((c * 0.137) % 1, 0.6, 0.95); hue[ch == c] = [r * 255, g * 255, bb * 255]
    l = bg + (hue - bg) * cov[..., None]
    cols.append(np.concatenate([b, np.full((n, 4, 3), 60.), l], 1))
im = np.concatenate([np.concatenate([c, np.full((4, c.shape[1], 3), 90.)], 0) for c in cols], 0).clip(0, 255).astype(np.uint8)
Image.fromarray(im).resize((im.shape[1] * S, im.shape[0] * S), Image.NEAREST).save(sys.argv[2])
print('rows:', ' | '.join(D['v'].keys()))
