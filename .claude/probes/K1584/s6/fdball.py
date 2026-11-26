# K1584 s6: where two captures differ, against the tight turns' balls (tight/<m>.json): changed pixels (|dLum| > 6)
# inside some ball's disk + 3 px (R = (r + W) * scale), per ball, with the sign (dark = ink added back), and every
# changed pixel outside all of them.
#   python fdball.py <capA template> <capB template> <out.json>      (templates hold {m})
import sys, json, os
import numpy as np
from PIL import Image
ta, tb, out = sys.argv[1:4]; here = os.path.dirname(os.path.abspath(__file__))
MZ = ['A_%s' % c for c in '3456789abcd'] + ['D_%s' % c for c in '123456789a']
def lum(p):
    x = np.asarray(Image.open(p + r'\gf_b2.png').convert('RGB')).astype(np.float32)
    return (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
res = []; tot = dict(inb_dark=0, inb_light=0, outb_dark=0, outb_light=0)
for m in MZ:
    if not all(os.path.exists(t.replace('{m}', m) + r'\gf_b2.png') for t in (ta, tb)): print(m, 'no capture'); continue
    J = json.load(open(os.path.join(here, 'tight', m + '.json'))); s = abs(J['A'][0])
    A, B = lum(ta.replace('{m}', m)), lum(tb.replace('{m}', m)); D = B - A; ch = np.abs(D) > 6
    H, Wd = ch.shape; owner = np.full(ch.shape, -1)
    for b in J['tight']:
        cx, cy = b['dev']; R = (b['r'] + J['W']) * s + 3
        y0, y1 = max(0, int(cy - R - 1)), min(H, int(cy + R + 2)); x0, x1 = max(0, int(cx - R - 1)), min(Wd, int(cx + R + 2))
        yy, xx = np.mgrid[y0:y1, x0:x1]; d = np.hypot(xx + 0.5 - cx, yy + 0.5 - cy) <= R
        sub = owner[y0:y1, x0:x1]; sub[d] = b['k']
    ys, xs = np.nonzero(ch); per = {}; outs = []
    for y, x in zip(ys.tolist(), xs.tolist()):
        dark = D[y, x] < 0; k = int(owner[y, x])
        if k >= 0:
            per.setdefault(k, [0, 0])[0 if dark else 1] += 1; tot['inb_dark' if dark else 'inb_light'] += 1
        else:
            outs.append((x, y, round(float(D[y, x]), 1))); tot['outb_dark' if dark else 'outb_light'] += 1
    res.append(dict(m=m, balls={str(k): v for k, v in per.items()}, outside=outs))
    print(m, 'changed', int(ch.sum()), 'balls [dark, light]', {k: v for k, v in sorted(per.items())}, 'outside', len(outs), outs[:10])
print('TOTAL', tot)
json.dump(res, open(out, 'w'))
