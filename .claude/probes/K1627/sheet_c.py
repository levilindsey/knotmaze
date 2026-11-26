# K1627 s2: sheet.py in colour (the wedges are colour edges, which sheet.py's grey tone map hides). One place per row,
# crops `master | yours` (real colours, nearest-neighbour at --scale, a red circle around the spot) plus the change
# master -> yours (magenta = any channel moved by more than 6 levels, over the dimmed master).
# Places: a JSON list {"n", "m", "x", "y", "r", "text"}.
#   python sheet_c.py <places.json> <outPrefix> [--per 4] [--half 20] [--scale 14] [--mine s2a] [--master m0] [--yl <second column's label>]
import sys, os, json, textwrap
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
SRC = {'master': os.path.join(O, opt('--master', 'm0')), 'yours': os.path.join(O, opt('--mine', 's2a'))}
PER = int(opt('--per', 4)); HF = int(opt('--half', 20)); SC = int(opt('--scale', 14))
places = json.load(open(a[0], encoding='utf-8-sig'))
pre = a[1]
T = ['master', 'yours']
S = 2 * HF * SC; G = 16; NC = len(T) + 1; W = NC * S + (NC + 1) * G
try:
    fb = ImageFont.truetype('arialbd.ttf', 26); fr = ImageFont.truetype('arial.ttf', 24); fh = ImageFont.truetype('arialbd.ttf', 22)
except Exception:
    fb = fr = fh = ImageFont.load_default()
C = {}
def img(t, m):
    k = (t, m)
    if k not in C: C[k] = np.asarray(Image.open(os.path.join(SRC[t], m, 'gf_b2.png')).convert('RGB')).astype(np.int16)
    return C[k]
for si in range(0, len(places), PER):
    chunk = places[si:si + PER]
    body = [textwrap.wrap(p['text'], width=int(W / 12.5)) for p in chunk]
    LH = [44 + 30 * len(b) for b in body]
    H = 50 + sum(LH) + len(chunk) * (S + G)
    sh = Image.new('RGB', (W, H), (34, 34, 34)); D = ImageDraw.Draw(sh)
    for c, lab in enumerate([T[0], opt('--yl', T[1])] + ['change (magenta: moved > 6 levels)']):
        D.text((G + c * (S + G) + 4, 14), lab, fill=(255, 230, 80), font=fh)
    y = 50
    for p, b, lh in zip(chunk, body, LH):
        D.text((G, y + 6), '%d.  %s  (%d,%d)' % (p['n'], p['m'], p['x'], p['y']), fill=(255, 255, 255), font=fb)
        for i, t in enumerate(b): D.text((G, y + 40 + 30 * i), t, fill=(215, 240, 215), font=fr)
        y += lh
        x0, y0 = int(p['x']) - HF, int(p['y']) - HF
        crops = [img(t, p['m'])[y0:y0 + 2 * HF, x0:x0 + 2 * HF] for t in T]
        ims = [Image.fromarray(c.astype(np.uint8)).resize((S, S), Image.NEAREST) for c in crops]
        d = np.abs(crops[1] - crops[0]).max(-1)
        rgb = (crops[0] * 0.35).astype(np.uint8); rgb[d > 6] = (255, 0, 255)
        ims.append(Image.fromarray(rgb).resize((S, S), Image.NEAREST))
        ux, uy, ur = (p['x'] - x0) * SC, (p['y'] - y0) * SC, p['r'] * SC
        for c, im in enumerate(ims):
            E = ImageDraw.Draw(im)
            for w in range(3): E.ellipse((ux - ur - w, uy - ur - w, ux + ur + w, uy + ur + w), outline=(255, 30, 30))
            sh.paste(im, (G + c * (S + G), y))
        y += S + G
    out = '%s_%d.png' % (pre, si // PER + 1); sh.save(out); print(out, sh.size)
