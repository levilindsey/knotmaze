# K1584 s6: ink inside each tight turn's ball (tight/<m>.json from tight.ts) in several captures.
#   python ballink.py <out.json> <capTemplate,...> [--pad px]
# Per ball: the disk of radius (r + W) * scale + pad around the fillet centre; ink px per capture (ink > 0.5), and
# the px inked in capture 0 but not in each other capture.
import sys, json, glob, os
import numpy as np
from PIL import Image
out = sys.argv[1]; caps = sys.argv[2].split(','); pad = float(sys.argv[sys.argv.index('--pad') + 1]) if '--pad' in sys.argv else 1.5
def ink(p):
    g = np.asarray(Image.open(p + r'\gf_b2.png').convert('L')).astype(np.float32)
    return np.clip((23.5 - g) / 3.5, 0, 1)
here = os.path.dirname(os.path.abspath(__file__)); res = []
for f in sorted(glob.glob(os.path.join(here, 'tight', '*.json'))):
    m = os.path.basename(f)[:-5]; J = json.load(open(f)); s = abs(J['A'][0])
    if not J['tight']: continue
    if not all(os.path.exists(c.replace('{m}', m) + r'\gf_b2.png') for c in caps): print(m, 'no capture'); continue
    I = [ink(c.replace('{m}', m)) for c in caps]
    for b in J['tight']:
        cx, cy = b['dev']; R = (b['r'] + J['W']) * s + pad
        y0, y1 = int(cy - R - 1), int(cy + R + 2); x0, x1 = int(cx - R - 1), int(cx + R + 2)
        yy, xx = np.mgrid[y0:y1, x0:x1]; d = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) <= R
        ins = [int(((a[y0:y1, x0:x1] > 0.5) & d).sum()) for a in I]
        lost = [int(((I[0][y0:y1, x0:x1] > 0.5) & (a[y0:y1, x0:x1] <= 0.5) & d).sum()) for a in I]
        res.append(dict(m=m, k=b['k'], j=b['j'], x=cx, y=cy, Rpx=round(R, 1), r=b['r'], disk=int(d.sum()), ink=ins, lost=lost))
json.dump(res, open(out, 'w'))
print('balls', len(res))
for th in (3, 10, 25):
    print('lost >=', th, [sum(1 for r in res if r['lost'][k] >= th) for k in range(len(caps))])
for r in sorted(res, key=lambda r: -r['lost'][-1])[:60]:
    print(r['m'], 'k%d' % r['k'], 'j%d' % r['j'], '%.0f,%.0f' % (r['x'], r['y']), 'R', r['Rpx'], 'disk', r['disk'], 'ink', r['ink'], 'lost', r['lost'])
