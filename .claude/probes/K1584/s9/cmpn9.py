# K1584 s9: s9a (the rule, line 42.5 deg) against s9n (the same HEAD with no wedge anywhere, capn9.ps1), all 21 mazes.
# A ball on the loose side must draw exactly what s9n draws (bs = 1: stage 5's gap with stages 7 and 8 on top); a ball
# on the tight side keeps its wedge, so it differs. Per ball in a crossing's gap (out/measure.json): pixels within
# 30 px of its centre that differ by > 1 and > 6 levels; every differing pixel farther than 30 px from every ball is
# listed too. Writes a sheet (stage 5 | s9n | s9a | diff in magenta) of every ball or place with a difference.
#   python cmpn9.py [line_deg=42.5] [thr=1]
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(here, '..')
line = float(sys.argv[1]) if len(sys.argv) > 1 else 42.5; thr = float(sys.argv[2]) if len(sys.argv) > 2 else 1
D = dict(s5=r's5\out\s5d', n=r's7\out\s9n', a=r's7\out\s9a')
rows = json.load(open(os.path.join(here, 'out', 'measure.json')))
MZ = ['A_3', 'A_4', 'A_5', 'A_6', 'A_7', 'A_8', 'A_9', 'A_a', 'A_b', 'A_c', 'A_d',
      'D_1', 'D_2', 'D_3', 'D_4', 'D_5', 'D_6', 'D_7', 'D_8', 'D_9', 'D_a']
def g(k, m): return np.asarray(Image.open(os.path.join(P, D[k], m, 'gf_b2.png')).convert('L')).astype(np.int16)
def view(k, m):
    return open(os.path.join(P, D[k], m, 'gf_b2view.txt')).readline().strip()
hits = []; tot = dict(tight=[0, 0, 0], loose=[0, 0, 0]); far = []
for m in MZ:
    A, N = g('a', m), g('n', m); d = np.abs(A - N); H, W = d.shape
    vs = 'view same' if view('a', m) == view('n', m) else 'VIEW DIFFERS'
    near = np.zeros_like(d, dtype=bool)
    for r in [r for r in rows if r['m'] == m]:
        x, y = int(round(r['dev'][0])), int(round(r['dev'][1])); w = (slice(max(y - 30, 0), y + 31), slice(max(x - 30, 0), x + 31))
        near[w] = True; side = 'tight' if r['deg'] < line else 'loose'
        c1, c6 = int((d[w] > thr).sum()), int((d[w] > 6).sum()); tot[side][0] += 1; tot[side][1] += c1; tot[side][2] += c6
        if c1: hits.append(dict(m=m, k=r['k'], deg=r['deg'], side=side, c1=c1, c6=c6, c=r['dev'], R=r['px']))
    ys, xs = np.nonzero((d > thr) & ~near)
    for yy, xx in zip(ys, xs): far.append((m, int(xx), int(yy), int(d[yy, xx])))
    print('%-4s %s  px > %g: %6d (near balls %d, elsewhere %d)' % (m, vs, thr, int((d > thr).sum()), int(((d > thr) & near).sum()), int(((d > thr) & ~near).sum())))
print('\nballs in a gap by side: count, px > %g, px > 6 within 30 px (s9a vs s9n)' % thr)
for s in ('tight', 'loose'): print('  %-5s %3d balls  %5d px  %5d px' % (s, *tot[s]))
print('\nballs with a difference:')
for h in sorted(hits, key=lambda h: h['deg']): print('  %-4s k%-4d %6.1f deg %-5s  %4d px > %g, %4d px > 6' % (h['m'], h['k'], h['deg'], h['side'], h['c1'], thr, h['c6']))
print('\npixels > %g farther than 30 px from every ball: %d' % (thr, len(far)))
for f in far[:40]: print('  %s (%d, %d) step %d' % f)
# the sheet: one row per ball with a difference, plus one per far pixel cluster (first pixel of each 40 px cell)
cells = {}
for m, x, y, s in far: cells.setdefault((m, x // 40, y // 40), (m, x, y, s))
sheet = [dict(lab='#  %s k%d\nangle %.1f deg\n%s side\n%d px > %g\n%d px > 6' % (h['m'], h['k'], h['deg'], h['side'], h['c1'], thr, h['c6']),
              m=h['m'], c=h['c'], R=h['R'], tight=h['side'] == 'tight') for h in sorted(hits, key=lambda h: h['deg'])]
sheet += [dict(lab='%s far pixel\n(%d, %d)\nstep %d' % v, m=v[0], c=[v[1], v[2]], R=0, tight=False) for v in cells.values()]
if sheet:
    HF, SC, LW, TH, G = 22, 5, 230, 34, 6; S = 2 * HF * SC
    try: fnt = ImageFont.truetype('arialbd.ttf', 19)
    except Exception: fnt = ImageFont.load_default()
    cols = [('stage 5', 's5'), ('s9n (no wedge)', 'n'), ('s9a (rule)', 'a'), ('s9a vs s9n > %g (magenta)' % thr, None)]
    sh = Image.new('RGB', (LW + len(cols) * (S + G), TH + len(sheet) * (S + G)), (30, 30, 30)); Dw = ImageDraw.Draw(sh)
    for c, (lab, _) in enumerate(cols): Dw.text((LW + c * (S + G) + 6, 7), lab, fill=(255, 255, 0), font=fnt)
    for i, b in enumerate(sheet):
        m = b['m']; cx, cy = b['c']; x, y = int(round(cx)), int(round(cy)); Y = TH + i * (S + G)
        Dw.text((8, Y + 6), b['lab'], fill=(120, 255, 120) if b['tight'] else (255, 255, 255), font=fnt)
        cr = {k: g(k, m)[y - HF:y + HF, x - HF:x + HF].astype(np.float32) for k in ('s5', 'n', 'a')}
        for c, (_, k) in enumerate(cols):
            gg = cr[k if k else 'a']; im = np.stack([np.clip((gg - 18) / 24 * 255, 0, 255).astype(np.uint8)] * 3, -1)
            if k is None: im[np.abs(cr['a'] - cr['n']) > thr] = (255, 0, 255)
            pim = Image.fromarray(im).resize((S, S), Image.NEAREST); dd = ImageDraw.Draw(pim)
            c0 = (cx - (x - HF)) * SC; c1 = (cy - (y - HF)) * SC
            if b['R'] and c == 0: dd.ellipse((c0 - b['R'] * SC, c1 - b['R'] * SC, c0 + b['R'] * SC, c1 + b['R'] * SC), outline=(255, 60, 60), width=2)
            dd.ellipse((c0 - 2, c1 - 2, c0 + 2, c1 + 2), fill=(255, 60, 60)); sh.paste(pim, (LW + c * (S + G), Y))
    o = os.path.join(here, 'out', 'cmpn9.png'); sh.save(o); print('\nsheet', o, sh.size, len(sheet), 'rows')
