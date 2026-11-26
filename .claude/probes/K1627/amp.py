# K1627 s2: small changes made visible. For each place, master's crop beside the change (any channel step > 0 in
# magenta over the dimmed master), nearest-neighbour at --scale. One row of crops per maze/place pair.
#   python amp.py <out.png> <master tag> <mine tag> [--half 14] [--scale 8] maze:x,y ...
import sys, os
import numpy as np
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
HF = int(opt('--half', 14)); SC = int(opt('--scale', 8))
pl = [x for x in a[3:] if ':' in x]
S = 2 * HF * SC; G = 8
sh = Image.new('RGB', (2 * S + 3 * G, len(pl) * (S + G + 20) + G), (34, 34, 34)); D = ImageDraw.Draw(sh)
for i, t in enumerate(pl):
    m, xy = t.split(':'); x, y = map(int, xy.split(','))
    A = np.asarray(Image.open(os.path.join(O, a[1], m, 'gf_b2.png')).convert('RGB')).astype(int)[y - HF:y + HF, x - HF:x + HF]
    B = np.asarray(Image.open(os.path.join(O, a[2], m, 'gf_b2.png')).convert('RGB')).astype(int)[y - HF:y + HF, x - HF:x + HF]
    d = np.abs(A - B).max(-1); c = (A * 0.4).astype(np.uint8); c[d > 0] = (255, 0, 255)
    y0 = G + i * (S + G + 20)
    D.text((G, y0), '%s (%d,%d)' % (m, x, y), fill=(255, 255, 255))
    sh.paste(Image.fromarray(A.astype(np.uint8)).resize((S, S), Image.NEAREST), (G, y0 + 16))
    sh.paste(Image.fromarray(c).resize((S, S), Image.NEAREST), (2 * G + S, y0 + 16))
sh.save(a[0]); print(a[0], sh.size)
