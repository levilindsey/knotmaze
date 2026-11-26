# K1584 s12 sheets (from review12/sheet12.py in k1584-s11): one place per row, large crops of gf_b2.png tone-mapped as
# sheet11.py (gray clip((g - 18) / 24 * 255)), nearest-neighbour at --scale, a red circle around the spot in each crop
# and a label above the row. Columns: --cols today,master,yours (default) or any of today|master|yours|change (change:
# red = lighter in yours than master, green = darker, by more than 4 levels).
# today = the gap worktree's s1/out/before, master = s12/out/m12, yours = s12/out/<--tag, default s12a>.
# Places: a JSON list {"n", "m", "x", "y", "r", "text", optional "cx"/"cy"} (or chg12's json with --chg: every place,
# numbered in order, circled around its changed pixels).
#   python sheet12s.py <places.json> <outPrefix> [--per 4] [--half 20] [--scale 14] [--only 3] [--cols ...] [--chg]
import sys, os, json, textwrap
import numpy as np
from PIL import Image, ImageDraw, ImageFont
K = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees'
here = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[1:]
opt = lambda n, d: a[a.index(n) + 1] if n in a else d
TAG = opt('--tag', 's12a')
SRC = {'today': K + r'\agent-a2dfb242b056cf793\.claude\probes\K1584\s1\out\before',
       'master': os.path.join(here, 'out', 'm12'), 'yours': os.path.join(here, 'out', TAG)}
PER = int(opt('--per', 4)); HF = int(opt('--half', 20)); SC = int(opt('--scale', 14))
COLS = opt('--cols', 'today,master,yours').split(',')
only = set(int(v) for v in opt('--only', '').split(',') if v)
J = json.load(open(a[0], encoding='utf8'))
if '--chg' in a:
    P = []
    for i, p in enumerate(J['places']):
        r = max(6, 0.5 * max(p['x1'] - p['x0'], p['y1'] - p['y0']) + 3)
        P.append(dict(n=i + 1, m=p['m'], x=p['x'], y=p['y'], r=r, text='%s (%.0f, %.0f): %d px changed, max step %d; under chain %s at crossing x%s (over %s); %s' % (
            p['m'], p['x'], p['y'], p['px'], p['maxd'], p['c'], p['xi'], p['o'], p['codes'])))
    J = P
places = [p for p in J if not only or p['n'] in only]
pre = a[1]
S = 2 * HF * SC; G = 16; NC = len(COLS); W = NC * S + (NC + 1) * G
try:
    fb = ImageFont.truetype('arialbd.ttf', 26); fr = ImageFont.truetype('arial.ttf', 22); fh = ImageFont.truetype('arialbd.ttf', 22)
except Exception:
    fb = fr = fh = ImageFont.load_default()
C = {}
def gray(t, m):
    k = (t, m)
    if k not in C: C[k] = np.asarray(Image.open(os.path.join(SRC[t], m, 'gf_b2.png')).convert('L')).astype(np.float32)
    return C[k]
def lines(p):
    return '%d.  %s' % (p['n'], p['m']), textwrap.wrap(p['text'], width=max(30, int(W / 11.5)))
outs = []
for si in range(0, len(places), PER):
    chunk = places[si:si + PER]
    LH = [44 + 28 * len(lines(p)[1]) for p in chunk]
    H = 50 + sum(LH) + len(chunk) * (S + G)
    sh = Image.new('RGB', (W, H), (34, 34, 34)); D = ImageDraw.Draw(sh)
    for c, lab in enumerate(COLS):
        D.text((G + c * (S + G) + 4, 14), {'change': 'change (red lighter, green darker)'}.get(lab, lab), fill=(255, 230, 80), font=fh)
    y = 50
    for p, lh in zip(chunk, LH):
        head, body = lines(p)
        D.text((G, y + 6), head, fill=(255, 255, 255), font=fb)
        for i, t in enumerate(body): D.text((G, y + 40 + 28 * i), t, fill=(215, 240, 215), font=fr)
        y += lh
        cx, cy = p.get('cx', p['x']), p.get('cy', p['y'])
        x0, y0 = int(round(cx)) - HF, int(round(cy)) - HF
        crop = lambda t: gray(t, p['m'])[y0:y0 + 2 * HF, x0:x0 + 2 * HF]
        tone = lambda g: np.clip((g - 18) / 24 * 255, 0, 255)
        ims = []
        for t in COLS:
            if t == 'change':
                cm, cy_ = crop('master'), crop('yours'); dd = cy_ - cm
                rgb = np.stack([(tone(cy_) * 0.35).astype(np.uint8)] * 3, -1); rgb[dd > 4] = (230, 40, 40); rgb[dd < -4] = (40, 220, 60)
                ims.append(Image.fromarray(rgb).resize((S, S), Image.NEAREST))
            else:
                ims.append(Image.fromarray(tone(crop(t)).astype(np.uint8)).resize((S, S), Image.NEAREST).convert('RGB'))
        ux, uy, ur = (p['x'] - x0) * SC, (p['y'] - y0) * SC, p['r'] * SC
        for c, im in enumerate(ims):
            E = ImageDraw.Draw(im)
            for w in range(3): E.ellipse((ux - ur - w, uy - ur - w, ux + ur + w, uy + ur + w), outline=(255, 30, 30))
            sh.paste(im, (G + c * (S + G), y))
        y += S + G
    out = '%s_%d.png' % (pre, si // PER + 1); sh.save(out); outs.append(out); print(out, sh.size)
