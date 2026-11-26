# K1584 land8: sheets of cmp4.py's changed places, s8a | land8 | master (j5) | today (m0) | diff, each crop made by
# screen/region.py (the sheets' tone map, scale 4), the diff panel marking L != A pixels (green = as master draws a
# junction-rule pixel, cyan = overlap taken from master, yellow = overlap taken from s8a, red = L differs from both).
#   python sheet_l8.py <cmp4.json> <outPrefix> <A tmpl> <L tmpl> <J tmpl> <M tmpl> [--top N] [--rows R] [--only m,m]
import sys, json, os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
cj, pre, tA, tL, tJ, tM = sys.argv[1:7]
a = sys.argv[7:]
top = int(a[a.index('--top') + 1]) if '--top' in a else 40
rows = int(a[a.index('--rows') + 1]) if '--rows' in a else 8
only = set(a[a.index('--only') + 1].split(',')) if '--only' in a else None
R = json.load(open(cj)); thr = R['thr']
P = [p for p in R['places'] if not only or p['m'] in only]
P.sort(key=lambda p: -(p['px'] + p['devMiss']))
dev = [p for p in P if p['devChg'] + p['devMiss'] + p['ovX'] > 0]
dev.sort(key=lambda p: -(p['devChg'] + p['devMiss'] + p['ovX']))
# --dev N: only the N places with the most pixels off the prediction (devChg + devMiss + ovX); default: the top
# places by size
sel = dev[:int(a[a.index('--dev') + 1])] if '--dev' in a else P[:top]
CACHE = {}


def full(t, m):
    k = t.format(m=m)
    if k not in CACHE:
        CACHE[k] = np.asarray(Image.open(k + r'\gf_b2.png').convert('RGB')).astype(np.int16)
    return CACHE[k]
reg = os.path.join(os.path.dirname(__file__), '..', 'screen', 'region.py')
tmp = tempfile.mkdtemp(prefix='l8sheet')
# --sc S --minw W: zoom and smallest crop (defaults 4 and 72 px); --by devMiss|devChg|ovX: --dev sorts by that class
SC = int(a[a.index('--sc') + 1]) if '--sc' in a else 4
MINW = int(a[a.index('--minw') + 1]) if '--minw' in a else 72
if '--by' in a:
    kb = a[a.index('--by') + 1]; dev.sort(key=lambda p: -p[kb])
    sel = dev[:int(a[a.index('--dev') + 1])] if '--dev' in a else sel
try: fnt = ImageFont.truetype('arialbd.ttf', 16)
except Exception: fnt = ImageFont.load_default()


def box(p):
    x0, y0, x1, y1 = p['box']
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    w = max(MINW, x1 - x0 + 24); h = max(MINW, y1 - y0 + 24)
    w = min(w, 160); h = min(h, 160)
    return [cx - w // 2, cy - h // 2, cx - w // 2 + w, cy - h // 2 + h]


cells = []
for n, p in enumerate(sel):
    b = box(p); bs = ','.join(str(v) for v in b)
    pan = []
    for k, t in enumerate([tA, tL, tJ, tM]):
        o = os.path.join(tmp, '%d_%d.png' % (n, k))
        subprocess.run([sys.executable, reg, o, t.format(m=p['m']), bs, str(SC)], check=True, capture_output=True)
        pan.append(Image.open(o).convert('RGB'))
    ld = lambda t: full(t, p['m'])[b[1]:b[3], b[0]:b[2]]
    A, L, J, M = ld(tA), ld(tL), ld(tJ), ld(tM)
    d = lambda u, v: np.abs(u - v).max(axis=2) > thr
    dLA, dJM, dAM = d(L, A), d(J, M), d(A, M)
    ov = dJM & dAM
    Pp = np.where(dJM[..., None], J, A)
    dLP = d(L, Pp) & ~ov
    g = L.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    base = np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8) // 3
    rgb = np.stack([base] * 3, axis=2)
    rgb[dJM & ~dAM & ~dLP & dLA] = (60, 220, 60)
    rgb[ov & ~d(L, J)] = (40, 200, 230)
    rgb[ov & d(L, J) & ~d(L, A)] = (240, 220, 40)
    rgb[(ov & d(L, J) & d(L, A)) | dLP] = (240, 40, 40)
    pan.append(Image.fromarray(rgb).resize(pan[0].size, Image.NEAREST))
    cells.append((p, pan, b))

W = sum(im.size[0] for im in cells[0][1]) + 6 * 5 if cells else 100
for s in range(0, len(cells), rows):
    ch = cells[s:s + rows]
    H = sum(c[1][0].size[1] + 26 for c in ch) + 30
    sh = Image.new('RGB', (W, H), (90, 90, 90)); dr = ImageDraw.Draw(sh)
    dr.text((6, 6), 's8a | land8 | master j5 | today m0 | L!=A (green junction as master, cyan overlap=master, yellow overlap=s8a, red other)', fill=(255, 255, 255), font=fnt)
    y = 30
    for p, pan, b in ch:
        dr.text((6, y + 2), '%s  box %d,%d-%d,%d  L!=A %d px (jOK %d, ovJ %d, ovA %d, ovX %d, devC %d, devM %d) max %d lv  near %s %.0f px, x%s %.0f px' % (
            p['m'], *p['box'], p['px'], p['jOK'], p['ovJ'], p['ovA'], p['ovX'], p['devChg'], p['devMiss'], p['maxLv'], p['jun'], p['dJun'], p['x'], p['dX']), fill=(255, 255, 120), font=fnt)
        x = 0; y += 24
        for im in pan:
            sh.paste(im, (x, y)); x += im.size[0] + 6
        y += pan[0].size[1] + 2
    o = '%s_%d.png' % (pre, s // rows + 1); sh.save(o); print(o, sh.size)
print('places on sheets:', len(cells), 'of', len(P), '; deviating places:', len(dev))
