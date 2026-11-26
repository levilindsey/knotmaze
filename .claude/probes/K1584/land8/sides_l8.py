# K1584 land8: every crossing side whose on-screen verdict changes s8a -> land8, read in all four captures (today m0,
# master j5, s8a, land8) by screen.py, with the distance from the side's sample point to the nearest junction centre
# (land8's sites_gf.json), and a sheet: s8a | land8 | master j5 | today m0, the side's point ringed (white).
#   python sides_l8.py <outDir> <cnt tmpl> <m0 tmpl> <j5 tmpl> <s8a tmpl> <land8 tmpl> [--rows 8]
import sys, json, os, subprocess, tempfile, collections
import numpy as np
from PIL import Image, ImageDraw, ImageFont
od, tC, tM, tJ, tA, tL = sys.argv[1:7]
a = sys.argv[7:]
rows = int(a[a.index('--rows') + 1]) if '--rows' in a else 8
MZ = ['A_%s' % c for c in '3456789abcd'] + ['D_%s' % c for c in '123456789a']
here = os.path.dirname(os.path.abspath(__file__))
scr = os.path.join(here, '..', 'screen', 'screen.py'); reg = os.path.join(here, '..', 'screen', 'region.py')
os.makedirs(od, exist_ok=True)
ch = []; tr = collections.Counter(); trJ = collections.Counter(); n = 0
for m in MZ:
    js = os.path.join(od, m + '.json')
    if not os.path.exists(js):
        subprocess.run([sys.executable, scr, tC.format(m=m), tM.format(m=m), tJ.format(m=m), tA.format(m=m), tL.format(m=m),
                        '--json', js], check=True, capture_output=True)
    S = json.load(open(js))['sides']
    jun = [(s['site'], s['x'], s['y']) for s in json.load(open(tL.format(m=m) + r'\sites_gf.json'))['sites'] if s['kind'] == 'junction']
    for s in S:
        v = [x['v'] for x in s['scr']]; n += 1
        if v[0] != v[1]: trJ[(v[0], v[1])] += 1
        if v[2] == v[3]: continue
        tr[(v[2], v[3])] += 1
        at = s.get('at') or s['dev']
        dj = min(jun, key=lambda j: (j[1] - at[0]) ** 2 + (j[2] - at[1]) ** 2)
        ch.append({'m': m, 'i': s['i'], 'dir': s['dir'], 'lat': s['lat'], 'at': at, 'v': v,
                   'gap': [round(x['gap'], 3) if x['gap'] == x['gap'] else None for x in s['scr']],
                   'far': [round(x['far'], 3) if x['far'] == x['far'] else None for x in s['scr']],
                   'jun': dj[0], 'dJun': round(float(np.hypot(dj[1] - at[0], dj[2] - at[1])), 1)})
json.dump(ch, open(os.path.join(od, 'sides_changed.json'), 'w'), indent=1)
print('sides', n, '; changed s8a -> land8:', len(ch))
for k, c in sorted(tr.items(), key=lambda t: -t[1]): print('  s8a %s -> land8 %s: %d' % (k[0], k[1], c))
print('for reference, today m0 -> master j5 on the same sides:')
for k, c in sorted(trJ.items(), key=lambda t: -t[1]): print('  m0 %s -> j5 %s: %d' % (k[0], k[1], c))
print('%-4s %4s %3s %3s %-38s %-26s %-26s %-10s %5s' % ('maze', 'x', 'dir', 'lat', 'verdict m0 | j5 | s8a | land8', 'gap ink m0|j5|s8a|L8', 'far ink m0|j5|s8a|L8', 'junction', 'dJun'))
for c in sorted(ch, key=lambda c: (c['v'][2] + c['v'][3], c['m'])):
    f = lambda l: '|'.join('-' if x is None else '%.2f' % x for x in l)
    print('%-4s %4d %3d %3d %-38s %-26s %-26s %-10s %5.1f' % (c['m'], c['i'], c['dir'], c['lat'], ' | '.join(c['v']), f(c['gap']), f(c['far']), c['jun'], c['dJun']))
# sheet
try: fnt = ImageFont.truetype('arialbd.ttf', 16)
except Exception: fnt = ImageFont.load_default()
tmp = tempfile.mkdtemp(prefix='l8sides'); SC = 4; HW = 36
cells = []
for k, c in enumerate(sorted(ch, key=lambda c: (c['v'][2] + c['v'][3], c['m']))):
    x, y = int(round(c['at'][0])), int(round(c['at'][1])); b = [x - HW, y - HW, x + HW, y + HW]; bs = ','.join(map(str, b))
    pan = []
    for q, t in enumerate([tA, tL, tJ, tM]):
        o = os.path.join(tmp, '%d_%d.png' % (k, q))
        subprocess.run([sys.executable, reg, o, t.format(m=c['m']), bs, str(SC)], check=True, capture_output=True)
        im = Image.open(o).convert('RGB'); d = ImageDraw.Draw(im)
        px, py = (c['at'][0] - b[0]) * SC, (c['at'][1] - b[1]) * SC
        d.ellipse([px - 14, py - 14, px + 14, py + 14], outline=(255, 255, 255), width=2)
        pan.append(im)
    cells.append((c, pan))
W = sum(im.size[0] for im in cells[0][1]) + 6 * 4 if cells else 100
for s in range(0, len(cells), rows):
    cc = cells[s:s + rows]
    H = sum(p[0].size[1] + 26 for _, p in cc) + 30
    sh = Image.new('RGB', (W, H), (90, 90, 90)); d = ImageDraw.Draw(sh)
    d.text((6, 6), 's8a | land8 | master j5 | today m0  (ring = the side screen.py reads)', fill=(255, 255, 255), font=fnt)
    y = 30
    for c, pan in cc:
        d.text((6, y + 2), '%s x%d dir %d lat %d  %s  gap ink %s  far %s  %s %.0f px' % (
            c['m'], c['i'], c['dir'], c['lat'], ' | '.join(c['v']), c['gap'], c['far'], c['jun'], c['dJun']), fill=(255, 255, 120), font=fnt)
        x = 0; y += 24
        for im in pan: sh.paste(im, (x, y)); x += im.size[0] + 6
        y += pan[0].size[1] + 2
    o = os.path.join(od, 'sides_%d.png' % (s // rows + 1)); sh.save(o); print(o, sh.size)
