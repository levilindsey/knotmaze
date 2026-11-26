# K1604 s1 (from k1584-s11's review12/sheet12.py): one place per row, crops `today | master | yours` (+ the change
# master -> yours: red = lighter in yours, green = darker, by more than 4 levels), tone-mapped as sheet12.py
# (gray clip((g - 18) / 24 * 255)), nearest-neighbour at --scale, a red circle around the spot in every crop.
# Places: a JSON list {"n", "m", "x", "y", "r", "text", optional "cx"/"cy"}.
#   python sheet.py <places.json> <outPrefix> [--per 4] [--half 20] [--scale 14] [--only 1,2] [--mine k1] [--master m0] [--cols today,master,yours]
import sys, os, json, textwrap
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
SRC = {'today': r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a2dfb242b056cf793\.claude\probes\K1584\s1\out\before',
       'master': os.path.join(O, opt('--master', 'm0')), 'yours': os.path.join(O, opt('--mine', 'k1'))}
PER = int(opt('--per', 4)); HF = int(opt('--half', 20)); SC = int(opt('--scale', 14))
only = set(int(v) for v in opt('--only', '').split(',') if v)
places = [p for p in json.load(open(a[0], encoding='utf8')) if not only or p['n'] in only]
pre = a[1]
T = opt('--cols', 'today,master,yours').split(',')
S = 2 * HF * SC; G = 16; NC = len(T) + 1; W = NC * S + (NC + 1) * G
try:
    fb = ImageFont.truetype('arialbd.ttf', 26); fr = ImageFont.truetype('arial.ttf', 24); fh = ImageFont.truetype('arialbd.ttf', 22)
except Exception:
    fb = fr = fh = ImageFont.load_default()
C = {}
def gray(t, m):
    k = (t, m)
    if k not in C: C[k] = np.asarray(Image.open(os.path.join(SRC[t], m, 'gf_b2.png')).convert('L')).astype(np.float32)
    return C[k]
outs = []
for si in range(0, len(places), PER):
    chunk = places[si:si + PER]
    body = [textwrap.wrap(p['text'], width=int(W / 12.5)) for p in chunk]
    LH = [44 + 30 * len(b) for b in body]
    H = 50 + sum(LH) + len(chunk) * (S + G)
    sh = Image.new('RGB', (W, H), (34, 34, 34)); D = ImageDraw.Draw(sh)
    for c, lab in enumerate(T + ['change master -> yours (red lighter, green darker)']):
        D.text((G + c * (S + G) + 4, 14), lab, fill=(255, 230, 80), font=fh)
    y = 50
    for p, b, lh in zip(chunk, body, LH):
        D.text((G, y + 6), '%d.  %s' % (p['n'], p['m']), fill=(255, 255, 255), font=fb)
        for i, t in enumerate(b): D.text((G, y + 40 + 30 * i), t, fill=(215, 240, 215), font=fr)
        y += lh
        cx, cy = p.get('cx', p['x']), p.get('cy', p['y'])
        x0, y0 = int(round(cx)) - HF, int(round(cy)) - HF
        crops = [gray(t, p['m'])[y0:y0 + 2 * HF, x0:x0 + 2 * HF] for t in T]
        ims = [Image.fromarray(np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)).resize((S, S), Image.NEAREST).convert('RGB') for g in crops]
        cy_, cm_ = crops[T.index('yours')], crops[T.index('master')]
        d = cy_ - cm_; base = (np.clip((cy_ - 18) / 24 * 255, 0, 255) * 0.35).astype(np.uint8)
        rgb = np.stack([base] * 3, -1); rgb[d > 4] = (230, 40, 40); rgb[d < -4] = (40, 220, 60)
        ims.append(Image.fromarray(rgb).resize((S, S), Image.NEAREST))
        ux, uy, ur = (p['x'] - x0) * SC, (p['y'] - y0) * SC, p['r'] * SC
        for c, im in enumerate(ims):
            E = ImageDraw.Draw(im)
            for w in range(4): E.ellipse((ux - ur - w, uy - ur - w, ux + ur + w, uy + ur + w), outline=(255, 30, 30))
            sh.paste(im, (G + c * (S + G), y))
        y += S + G
    out = '%s_%d.png' % (pre, si // PER + 1); sh.save(out); outs.append(out); print(out, sh.size)
