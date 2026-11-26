# K1584 s10: the three tight balls for Levi, large: one row per ball, columns from --cols ("label=dir{m},...", dirs
# relative to the K1584 probes folder, {m} = maze), tone-mapped as sheet9.py (clip((g - 18) / 24 * 255) of gf_b2.png),
# nearest-neighbour at --scale. A thin red ring = the ball's disk (fillet radius + W) on the first column only. Under
# each row, the text of --notes "A_3:63=...|A_5:176=...".
#   python sheet10.py <out.png> --cols "today=s1\out\before\{m},..." [--half 18] [--scale 14] [--notes ...]
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(here, '..')
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
# the balls: maze, corner, device centre, ball radius (px), angle (deg)
BALLS = [('A_3', 63, 1056.0, 266.1, 6.47, 40.05), ('A_5', 176, 2343.7, 507.6, 6.45, 43.15), ('A_6', 265, 2304.5, 815.5, 8.45, 44.87)]
cols = [c.split('=', 1) for c in arg('--cols', '').split(',') if c]
HF = int(arg('--half', 18)); SC = int(arg('--scale', 14)); S = 2 * HF * SC
notes = dict(n.split('=', 1) for n in arg('--notes', '').split('|') if '=' in n)
G = 8; TH = 40; NH = 90; LW = 0
try: fnt = ImageFont.truetype('arialbd.ttf', 22); fs = ImageFont.truetype('arial.ttf', 20)
except Exception: fnt = fs = ImageFont.load_default()
sh = Image.new('RGB', (len(cols) * (S + G) + G, TH + len(BALLS) * (TH + S + NH)), (30, 30, 30)); D = ImageDraw.Draw(sh)
for c, (lab, _) in enumerate(cols): D.text((G + c * (S + G) + 6, 8), lab, fill=(255, 255, 0), font=fnt)
y = TH
for (m, k, cx, cy, R, ang) in BALLS:
    D.text((G + 4, y + 8), '%s k%d  (opens %.1f deg; red ring = the ball, its centre a dot)' % (m, k, ang), fill=(255, 255, 255), font=fnt)
    y += TH
    x0, y0 = int(round(cx)) - HF, int(round(cy)) - HF
    for c, (lab, d) in enumerate(cols):
        p = os.path.join(P, d.replace('{m}', m), 'gf_b2.png')
        X = G + c * (S + G)
        if not os.path.exists(p):
            D.text((X + 10, y + 10), 'missing', fill=(255, 80, 80), font=fs); continue
        g = np.asarray(Image.open(p).convert('L')).astype(np.float32)[y0:y0 + 2 * HF, x0:x0 + 2 * HF]
        t = np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)
        im = Image.fromarray(t).resize((S, S), Image.NEAREST).convert('RGB')
        if c == 0:
            E = ImageDraw.Draw(im); ux, uy = (cx - x0) * SC, (cy - y0) * SC
            E.ellipse((ux - R * SC, uy - R * SC, ux + R * SC, uy + R * SC), outline=(255, 40, 40), width=2)
            E.ellipse((ux - 4, uy - 4, ux + 4, uy + 4), fill=(255, 40, 40))
        sh.paste(im, (X, y))
    y += S
    nt = notes.get('%s:%d' % (m, k), '')
    for i, line in enumerate(nt.split(';')[:3]): D.text((G + 4, y + 6 + 26 * i), line.strip(), fill=(200, 255, 200), font=fs)
    y += NH
out = sys.argv[1]; sh.save(out); print(out, sh.size)
