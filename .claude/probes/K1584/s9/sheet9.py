# K1584 s9: the ranked ball sheet for Levi: every ball in a crossing's gap (out/measure.json, tightest first), columns
# today | stage 5 | V1 (s1/out/before, s5/out/s5d, s7/out/s8a), tone-mapped as wsheet.py / region.py's sheets
# (clip((g - 18) / 24 * 255) of gf_b2.png). A red ring = the ball's disk on the first column, its centre a red dot.
# The eight Levi saw on the wedge sheet are marked; extra columns (e.g. s9a) with --extra "label=dir,...".
#   python sheet9.py <outPrefix> [--per 13] [--half 22] [--scale 5] [--extra "s9=...\s9a"] [--line <deg>]
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(here, '..')
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
COLS = [('today', os.path.join(P, r's1\out\before\{m}')), ('stage 5', os.path.join(P, r's5\out\s5d\{m}')),
        ('V1 (wedge, stage 8)', os.path.join(P, r's7\out\s8a\{m}'))]
for e in [x for x in arg('--extra', '').split(',') if x]: COLS.append(tuple(e.split('=', 1)))
rows = json.load(open(os.path.join(here, 'out', 'measure.json')))
only = [x for x in arg('--only', '').split(',') if x]  # "A_5:176,A_8:81": just these balls, in this order
for i, r in enumerate(rows): r['rank'] = i + 1
if only: rows = [next(r for r in rows if '%s:%d' % (r['m'], r['k']) == o) for o in only]
per =int(arg('--per', 13)); HF = int(arg('--half', 22)); SC = int(arg('--scale', 5)); line = float(arg('--line', 0))
S = 2 * HF * SC; LW = 250; TH = 34; G = 6
try: fnt = ImageFont.truetype('arialbd.ttf', 19); fs = ImageFont.truetype('arial.ttf', 17)
except Exception: fnt = fs = ImageFont.load_default()
cache = {}
def img(p):
    if p not in cache: cache[p] = np.asarray(Image.open(p).convert('L')).astype(np.float32)
    return cache[p]
outs = []
for sh_i in range(0, len(rows), per):
    part = rows[sh_i:sh_i + per]
    sh = Image.new('RGB', (LW + len(COLS) * (S + G), TH + len(part) * (S + G)), (30, 30, 30)); D = ImageDraw.Draw(sh)
    for c, (lab, _) in enumerate(COLS): D.text((LW + c * (S + G) + 6, 7), lab, fill=(255, 255, 0), font=fnt)
    D.text((6, 7), 'tightest first', fill=(255, 255, 0), font=fnt)
    if line: D.text((6, sh.height - 24), 'blue bar: the line, %.1f deg' % line, fill=(0, 200, 255), font=fs)
    for r, b in enumerate(part):
        rank = b['rank']; m, k = b['m'], b['k']; J = json.load(open(os.path.join(P, 's6', 'tight', m + '.json')))
        s = abs(J['A'][0]); cx, cy = b['dev']; R = b['px']; x, y = int(round(cx)), int(round(cy)); Y = TH + r * (S + G)
        if line and b['deg'] >= line and (sh_i + r == 0 or rows[sh_i + r - 1]['deg'] < line):
            D.rectangle((0, Y - G + 1, sh.width, Y - 2), fill=(0, 200, 255))
        col = (255, 255, 255)
        txt = '#%d  %s k%d\nangle %.1f deg\nr/W %.2f\nball radius %.1f px' % (rank, m, k, b['deg'], b['rW'], R)
        if b['seen']:
            txt += '\n\nwedge sheet row %d' % b['seen']; col = (120, 255, 120) if b['seen'] == 8 else (255, 170, 90)
            txt += '\nyou: tight' if b['seen'] == 8 else '\nyou: not tight'
        D.text((8, Y + 6), txt, fill=col, font=fnt)
        for c, (_, t) in enumerate(COLS):
            p = os.path.join(t.replace('{m}', m), 'gf_b2.png')
            if not os.path.exists(p): sh.paste(Image.new('RGB', (S, S), (60, 0, 0)), (LW + c * (S + G), Y)); continue
            g = img(p)[y - HF:y + HF, x - HF:x + HF]
            im = Image.fromarray(np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)).resize((S, S), Image.NEAREST).convert('RGB')
            dd = ImageDraw.Draw(im); c0 = (cx - (x - HF)) * SC; c1 = (cy - (y - HF)) * SC
            if c == 0: dd.ellipse((c0 - R * SC, c1 - R * SC, c0 + R * SC, c1 + R * SC), outline=(255, 60, 60), width=2)
            dd.ellipse((c0 - 2, c1 - 2, c0 + 2, c1 + 2), fill=(255, 60, 60))
            sh.paste(im, (LW + c * (S + G), Y))
    o = '%s_%d.png' % (sys.argv[1], sh_i // per + 1); sh.save(o); outs.append(o); print(o, sh.size)
