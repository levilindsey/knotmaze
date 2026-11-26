# K1584 s9: every changed place s8a -> s9a (out/chg9.json from chg9.py), one row per ball with a changed pixel within
# 30 px (places farther from every ball get a row of their own), columns stage 5 | s8a | s9a | change (s9a with each
# pixel that moved > thr levels s8a -> s9a in magenta), tone-mapped as sheet9.py. Tightest ball first.
#   python chgsheet9.py <outPrefix> [--per 10] [--half 22] [--scale 5] [--thr 1]
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(here, '..')
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
per = int(arg('--per', 10)); HF = int(arg('--half', 22)); SC = int(arg('--scale', 5)); thr = float(arg('--thr', 1))
DIRS = [('stage 5', r's5\out\s5d'), ('s8a (V1)', r's7\out\s8a'), ('s9a', r's7\out\s9a')]
C = json.load(open(os.path.join(here, 'out', 'chg9.json'))); meas = json.load(open(os.path.join(here, 'out', 'measure.json')))
rank = {(r['m'], r['k']): i + 1 for i, r in enumerate(meas)}; mrow = {(r['m'], r['k']): r for r in meas}
rows = []
for key, b in C['balls'].items():
    if b['chg'] > 0: rows.append(dict(m=b['m'], k=b['k'], deg=b['deg'], side=b['side'], chg=b['chg'], c=mrow[(b['m'], b['k'])]['dev'], R=mrow[(b['m'], b['k'])]['px']))
for p in C['places']:
    if p['dist'] >= 30: rows.append(dict(m=p['m'], k=None, deg=999, side='far', chg=p['px'], c=[p['x'], p['y']], R=0, near=p['ball'], dist=p['dist']))
rows.sort(key=lambda r: r['deg'])
try: fnt = ImageFont.truetype('arialbd.ttf', 19)
except Exception: fnt = ImageFont.load_default()
cache = {}
def img(m, d):
    if (m, d) not in cache: cache[(m, d)] = np.asarray(Image.open(os.path.join(P, d, m, 'gf_b2.png')).convert('L')).astype(np.float32)
    return cache[(m, d)]
S = 2 * HF * SC; LW = 260; TH = 34; G = 6; NC = len(DIRS) + 1
for sh_i in range(0, len(rows), per):
    part = rows[sh_i:sh_i + per]
    sh = Image.new('RGB', (LW + NC * (S + G), TH + len(part) * (S + G)), (30, 30, 30)); D = ImageDraw.Draw(sh)
    for c, lab in enumerate([d[0] for d in DIRS] + ['change s8a->s9a (magenta)']): D.text((LW + c * (S + G) + 6, 7), lab, fill=(255, 255, 0), font=fnt)
    for r, b in enumerate(part):
        m = b['m']; cx, cy = b['c']; x, y = int(round(cx)), int(round(cy)); Y = TH + r * (S + G)
        if b['k'] is None: txt = '%s far place\n(%.0f, %.0f)\n%d px changed\nnearest ball k%s\n%.0f px away' % (m, cx, cy, b['chg'], b['near'], b['dist'])
        else: txt = '#%d  %s k%d\nangle %.1f deg\n%s side\n%d px changed' % (rank[(m, b['k'])], m, b['k'], b['deg'], b['side'], b['chg'])
        D.text((8, Y + 6), txt, fill=(120, 255, 120) if b['side'] == 'tight' else (255, 255, 255), font=fnt)
        crops = [img(m, d)[y - HF:y + HF, x - HF:x + HF] for _, d in DIRS]
        for c in range(NC):
            g = crops[min(c, len(DIRS) - 1)]
            im = np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)
            rgb = np.stack([im] * 3, -1)
            if c == NC - 1: rgb[np.abs(crops[2] - crops[1]) > thr] = (255, 0, 255)
            pim = Image.fromarray(rgb).resize((S, S), Image.NEAREST)
            dd = ImageDraw.Draw(pim); c0 = (cx - (x - HF)) * SC; c1 = (cy - (y - HF)) * SC
            if b['R'] and c == 0: dd.ellipse((c0 - b['R'] * SC, c1 - b['R'] * SC, c0 + b['R'] * SC, c1 + b['R'] * SC), outline=(255, 60, 60), width=2)
            dd.ellipse((c0 - 2, c1 - 2, c0 + 2, c1 + 2), fill=(255, 60, 60))
            sh.paste(pim, (LW + c * (S + G), Y))
    o = '%s_%d.png' % (sys.argv[1], sh_i // per + 1); sh.save(o); print(o, sh.size, len(part), 'rows')
print('rows', len(rows))
