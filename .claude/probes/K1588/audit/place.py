# audit page pictures: one image per crossing, three panels (today's render | the border construction alone | the same
# with the trial rule), a red ring on every spot the trial rule changes.
#   python place.py <capDir> <cnt.json> <viewDir with b<id>.json / h<id>.json> <outDir> <id>...
import json, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
d, cj, v, out = sys.argv[1:5]; ids = [int(a) for a in sys.argv[5:]]
CN = json.load(open(cj)); CX = {c['i']: c for c in CN['crossings']}
Z, K, PAD, TOP = 4, 110, 10, 30
F = ImageFont.truetype(r'C:\Windows\Fonts\arial.ttf', 17)
LABS = ('today', 'today, gaps left out (check drawing)', 'trial: the junction keeps the under thread')
def inkimg(M):
    n = M['w']; ink = np.array(M['ink']).reshape(n, n); cov = np.array(M['cov']).reshape(n, n)
    a = 28 + 62 * cov; a = a * (1 - ink) + 255 * ink
    return Image.fromarray(a.astype(np.uint8)).convert('RGB')
for xi in ids:
    C = CX[xi]; B = json.load(open(f'{v}/b{xi}.json')); H = json.load(open(f'{v}/h{xi}.json')); n = B['w']
    cx, cy = C['dev']; g = Image.open(d + '/gf.png').convert('L').crop((int(cx) - 80, int(cy) - 80, int(cx) + 80, int(cy) + 80))
    g = ImageOps.autocontrast(ImageOps.invert(g)).convert('RGB')
    diff = (np.abs(np.array(B['ink']) - np.array(H['ink'])) > 0.2).reshape(n, n)
    o = (n - K) // 2; ys, xs = np.nonzero(diff[o:o + K, o:o + K]); cl = []
    for x, y in zip(xs, ys):
        for c in cl:
            if abs(c[0] / c[2] - x) < 14 and abs(c[1] / c[2] - y) < 14: c[0] += x; c[1] += y; c[2] += 1; break
        else: cl.append([float(x), float(y), 1])
    cl = [c for c in cl if c[2] >= 3]
    row = Image.new('RGB', (3 * K * Z + 2 * PAD, K * Z + TOP), (255, 255, 255)); Dr = ImageDraw.Draw(row)
    for k, im in enumerate((g, inkimg(B), inkimg(H))):
        x0 = k * (K * Z + PAD); row.paste(im.crop((o, o, o + K, o + K)).resize((K * Z, K * Z), Image.NEAREST), (x0, TOP))
        Dr.text((x0 + 4, 5), (f'{xi}: ' if k == 0 else '') + LABS[k], fill=(0, 0, 0), font=F)
        for c in cl:
            px = x0 + (c[0] / c[2] + 0.5) * Z; py = TOP + (c[1] / c[2] + 0.5) * Z; r = 46
            Dr.ellipse((px - r, py - r, px + r, py + r), outline=(235, 40, 40), width=3)
    row.save(f'{out}/p{xi}.png'); print(xi, 'changed px', int(diff.sum()), 'rings', len(cl), row.size)
