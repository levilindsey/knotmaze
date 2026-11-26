# K1584 s12: every changed place of chg12's json as a grid sheet for viewing: per place a one-line label (number, maze,
# position, px, under chain, crossing, codes) over three crops `master | yours | change` (sheet12s.py's tone map; change:
# red = lighter in yours, green = darker, by more than 4 levels), the changed pixels' box circled.
#   python grid12.py <chg12.json> <outPrefix> [--tag s12a] [--half 16] [--scale 7] [--cols 2] [--rows 4]
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
TAG = opt('--tag', 's12a'); HF = int(opt('--half', 16)); SC = int(opt('--scale', 7)); NCOL = int(opt('--cols', 2)); NROW = int(opt('--rows', 4))
SRC = {'master': os.path.join(here, 'out', 'm12'), 'yours': os.path.join(here, 'out', TAG)}
P = json.load(open(a[0]))['places']; pre = a[1]
S = 2 * HF * SC; g = 6; CW = 3 * S + 4 * g; LH = 26; CH = LH + S + 10
try: f = ImageFont.truetype('arial.ttf', 15)
except Exception: f = ImageFont.load_default()
C = {}
def gray(t, m):
    if (t, m) not in C: C[(t, m)] = np.asarray(Image.open(os.path.join(SRC[t], m, 'gf_b2.png')).convert('L')).astype(np.float32)
    return C[(t, m)]
tone = lambda v: np.clip((v - 18) / 24 * 255, 0, 255)
per = NCOL * NROW
for si in range(0, len(P), per):
    sh = Image.new('RGB', (NCOL * CW, NROW * CH), (34, 34, 34)); D = ImageDraw.Draw(sh)
    for k, p in enumerate(P[si:si + per]):
        n = si + k + 1; ox, oy = (k % NCOL) * CW, (k // NCOL) * CH
        D.text((ox + g, oy + 4), '%d. %s (%.0f,%.0f) %dpx c%s x%s o%s  %s' % (n, p['m'], p['x'], p['y'], p['px'], p['c'], p['xi'], p['o'], p['codes'].replace('L31/31 R31/31', 'full')), fill=(255, 240, 160), font=f)
        x0, y0 = int(round(p['x'])) - HF, int(round(p['y'])) - HF
        cm = gray('master', p['m'])[y0:y0 + 2 * HF, x0:x0 + 2 * HF]; cy = gray('yours', p['m'])[y0:y0 + 2 * HF, x0:x0 + 2 * HF]
        dd = cy - cm; rgb = np.stack([(tone(cy) * 0.35).astype(np.uint8)] * 3, -1); rgb[dd > 4] = (230, 40, 40); rgb[dd < -4] = (40, 220, 60)
        ims = [Image.fromarray(tone(cm).astype(np.uint8)).convert('RGB'), Image.fromarray(tone(cy).astype(np.uint8)).convert('RGB'), Image.fromarray(rgb)]
        bx0, by0, bx1, by1 = (p['x0'] - x0 - 1) * SC, (p['y0'] - y0 - 1) * SC, (p['x1'] - x0 + 2) * SC, (p['y1'] - y0 + 2) * SC
        for c, im in enumerate(ims):
            im = im.resize((S, S), Image.NEAREST); E = ImageDraw.Draw(im)
            E.rectangle((bx0, by0, bx1, by1), outline=(255, 40, 40), width=2)
            sh.paste(im, (ox + g + c * (S + g), oy + LH))
    out = '%s_%02d.png' % (pre, si // per + 1); sh.save(out); print(out, sh.size)
