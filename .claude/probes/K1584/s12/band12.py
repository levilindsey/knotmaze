# K1584 s12: where screen.py reads a side's ink. Per side (maze, crossing, dir, lat): today | master | yours crops at
# --scale, with the side's gapcheck points drawn on top (screen.py's margin band 0.03 <= e <= 0.08 red, its far band
# 0.17 <= e <= 0.22 blue, others small gray), each point's own ink value printed for the margin band.
#   python band12.py <outPng> A_3:254:-1:-1 [A_9:320:1:1 ...] [--half 14] [--scale 16]
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
K = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees'
G = K + r'\agent-a2dfb242b056cf793\.claude\probes\K1584'
here = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
HF = int(opt('--half', 14)); SC = int(opt('--scale', 16))
specs = [v for v in a[1:] if v.count(':') == 3]
SRC = [('today', G + r'\s1\out\before'), ('master', os.path.join(here, 'out', 'm12')), ('yours', os.path.join(here, 'out', 's12a'))]
INK = 20.0
def ink(img, x, y):
    x = np.clip(x - 0.5, 0, img.shape[1] - 1.001); y = np.clip(y - 0.5, 0, img.shape[0] - 1.001)
    x0 = int(np.floor(x)); y0 = int(np.floor(y)); fx = x - x0; fy = y - y0
    v = img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy
    return float(np.clip((INK + 3.5 - v) / 3.5, 0, 1))
try: f = ImageFont.truetype('arial.ttf', 18)
except Exception: f = ImageFont.load_default()
S = 2 * HF * SC; g = 12; LH = 60
sh = Image.new('RGB', (3 * S + 4 * g, len(specs) * (S + LH + g) + 30), (34, 34, 34)); D = ImageDraw.Draw(sh)
for c, (t, _) in enumerate(SRC): D.text((g + c * (S + g) + 4, 6), t, fill=(255, 230, 80), font=f)
for r, sp in enumerate(specs):
    m, xi, d, l = sp.split(':'); xi, d, l = int(xi), int(d), int(l)
    cnt = json.load(open(G + r'\s4\cnt\%s_s4.json' % m))
    cr = [c for c in cnt['crossings'] if c['i'] == xi][0]
    b = [b for b in cr['borders'] if b['dir'] == d and b['lat'] == l][0]
    p = np.array(b.get('pts') or [], np.float64).reshape(-1, 4)
    gm = (p[:, 2] >= 0.03) & (p[:, 2] <= 0.08)
    cx, cy = p[gm, 0].mean(), p[gm, 1].mean()
    x0, y0 = int(round(cx)) - HF, int(round(cy)) - HF
    y = 30 + r * (S + LH + g)
    vals = []
    for c, (t, src) in enumerate(SRC):
        img = np.asarray(Image.open(os.path.join(src, m, 'gf_b2.png')).convert('L')).astype(np.float32)
        crop = np.clip((img[y0:y0 + 2 * HF, x0:x0 + 2 * HF] - 18) / 24 * 255, 0, 255).astype(np.uint8)
        im = Image.fromarray(crop).resize((S, S), Image.NEAREST).convert('RGB'); E = ImageDraw.Draw(im)
        ik = [ink(img, q[0], q[1]) for q in p[gm]]; vals.append('%s %.3f' % (t, float(np.mean(ik))))
        for q in p:
            ux, uy = (q[0] - x0) * SC, (q[1] - y0) * SC
            if 0.03 <= q[2] <= 0.08: E.ellipse((ux - 4, uy - 4, ux + 4, uy + 4), outline=(255, 40, 40), width=2)
            elif 0.17 <= q[2] <= 0.22: E.ellipse((ux - 4, uy - 4, ux + 4, uy + 4), outline=(60, 140, 255), width=2)
            else: E.ellipse((ux - 1, uy - 1, ux + 1, uy + 1), fill=(150, 150, 150))
        sh.paste(im, (g + c * (S + g), y + LH))
    D.text((g, y + 4), '%s x%d dir %+d lat %+d (over %s): margin-band ink %s' % (m, xi, d, l, cr.get('over', cr.get('o', '?')), ' | '.join(vals)), fill=(255, 255, 255), font=f)
    D.text((g, y + 30), 'red: e 0.03..0.08 (screen.py gap band), blue: e 0.17..0.22 (far band); e range %.3f..%.3f' % (p[:, 2].min(), p[:, 2].max()), fill=(200, 220, 200), font=f)
sh.save(a[0]); print(a[0], sh.size)
