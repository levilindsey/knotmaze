# K1584 s8: s7/sheet7.py with the s8 capture (s8 = s8/out/s8a), true-colour crops (--raw) and several places per row
# (--per N; --bright: true colour stretched (c - 12) * 4, the same for every column). Columns are captures named by tag; the last column (optional) is the raw-luminance diff of two of them
# (red = lighter in the second, i.e. a cut opened; green = darker, ink restored).
#   python sheet8.py <out.png> <scale> <half> <cols> [--diff a,b] [--raw] [--per N] [--notes f.json] <place> ...
# cols: today s4 s5 s6 s7 s8. place: maze:x<idx>[:dx:dy] (the crossing's dev point from s5/cnt), maze:k<idx> (stage
# 6's tight ball), maze:@:X:Y[:label[:x0;y0;x1;y1]] (capture px; the box is drawn yellow). --notes: {label: text} drawn
# under the place's label row.
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
K = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DIRS = {'today': r's1\out\before', 's4': r's4\out\s4g', 's5': r's5\out\s5d', 's6': r's6\out\s6a', 's7': r's7\out\s7a',
        's8': r's7\out\s8a','pb': r's8\out\pred_b', 'pd': r's8\out\pred_d'}
a = sys.argv[1:]
dif, raw, per, notes = None, False, 1, {}
if '--diff' in a:
    i = a.index('--diff'); dif = a[i + 1].split(','); del a[i:i + 2]
if '--raw' in a: a.remove('--raw'); raw = True
bright = '--bright' in a
if bright: a.remove('--bright'); raw = True
if '--per' in a:
    i = a.index('--per'); per = int(a[i + 1]); del a[i:i + 2]
if '--notes' in a:
    i = a.index('--notes'); notes = json.load(open(a[i + 1], encoding='utf8')); del a[i:i + 2]
out, sc, hf, cols = a[0], int(a[1]), int(a[2]), a[3].split(',')
places = a[4:]
try:
    fnt = ImageFont.truetype('arialbd.ttf', 13); fnn = ImageFont.truetype('arial.ttf', 13)
except Exception:
    fnt = fnn = ImageFont.load_default()
_c, _t, _i = {}, {}, {}
def cnt(m):
    if m not in _c: _c[m] = {x['i']: x for x in json.load(open(os.path.join(K, 's5', 'cnt', f'{m}_s5d.json')))['crossings']}
    return _c[m]
def tight(m):
    if m not in _t: _t[m] = {b['k']: b for b in json.load(open(os.path.join(K, 's6', 'tight', m + '.json')))['tight']}
    return _t[m]
def rgbimg(tag, m):
    p = os.path.join(K, DIRS[tag], m, 'gf_b2.png')
    if p not in _i: _i[p] = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    return _i[p]
def lum(x): return (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
def crop(g, cx, cy):
    c = np.zeros((2 * hf, 2 * hf) + g.shape[2:], np.float32)
    y1, y2, x1, x2 = max(0, cy - hf), min(g.shape[0], cy + hf), max(0, cx - hf), min(g.shape[1], cx + hf)
    c[y1 - (cy - hf):y2 - (cy - hf), x1 - (cx - hf):x2 - (cx - hf)] = g[y1:y2, x1:x2]
    return c
def tone(c): return np.clip((c - 18) / 24 * 255, 0, 255).astype(np.uint8)
T = 2 * hf * sc; pad = 4; LH = 18 + (16 if notes else 0); gap = 14
ncol = len(cols) + (1 if dif else 0)
GW = ncol * (T + pad)
rows = (len(places) + per - 1) // per
S = Image.new('RGB', (per * GW + (per - 1) * gap, rows * (T + LH + pad)), (40, 0, 40)); d = ImageDraw.Draw(S)
for r0, pl in enumerate(places):
    r, gx = r0 // per, (r0 % per) * (GW + gap)
    q = pl.split(':'); m = q[0]; box = None
    if q[1] == '@':
        X, Y = float(q[2]), float(q[3]); lab = q[4] if len(q) > 4 else ''
        if len(q) > 5: box = [int(v) for v in q[5].split(';')]
        cx, cy = int(round(X)), int(round(Y))
    elif q[1].startswith('k'):
        b = tight(m)[int(q[1][1:])]; cx, cy = int(round(b['dev'][0])), int(round(b['dev'][1])); lab = q[1]
        X, Y = b['dev']
    else:
        xi = int(q[1].lstrip('x')); dx = int(q[2]) if len(q) > 2 else 0; dy = int(q[3]) if len(q) > 3 else 0
        x = cnt(m)[xi]; X, Y = x['dev']; cx, cy = int(round(X)) + dx, int(round(Y)) + dy; lab = 'x%d' % xi
    y0 = r * (T + LH + pad)
    for ci, tg in enumerate(cols):
        c = crop(rgbimg(tg, m), cx, cy)
        t = Image.fromarray(np.clip((c - 12) * 4 if bright else c, 0, 255).astype(np.uint8), 'RGB') if raw else Image.fromarray(tone(lum(c))).convert('RGB')
        t = t.resize((T, T), Image.LANCZOS if sc <= 3 else Image.NEAREST)
        S.paste(t, (gx + ci * (T + pad), y0 + LH)); d.text((gx + ci * (T + pad) + 2, y0 + 2), f'{m} {lab} {tg} ({cx},{cy})', fill=(255, 255, 0), font=fnt)
    nt = notes.get(f'{m} {lab}') or notes.get(lab)
    if nt: d.text((gx + 2, y0 + 18), nt, fill=(235, 235, 235), font=fnn)
    if dif:
        A, B = lum(crop(rgbimg(dif[0], m), cx, cy)), lum(crop(rgbimg(dif[1], m), cx, cy))
        g = tone(B) // 2; rgb = np.stack([g, g, g], -1)
        up, dn = (B - A) > 3, (B - A) < -3
        rgb[up] = (255, 40, 40); rgb[dn] = (40, 255, 40)
        t = Image.fromarray(rgb.astype(np.uint8), 'RGB').resize((T, T), Image.NEAREST)
        S.paste(t, (gx + len(cols) * (T + pad), y0 + LH))
        d.text((gx + len(cols) * (T + pad) + 2, y0 + 2), f'{dif[0]}->{dif[1]} +{int(up.sum())} -{int(dn.sum())}', fill=(255, 255, 0), font=fnt)
    for ci in range(ncol):
        ox = gx + ci * (T + pad); oy = y0 + LH
        mx = ox + (X - (cx - hf)) * sc; my = oy + (Y - (cy - hf)) * sc
        d.line([(mx - 5, my), (mx + 5, my)], fill=(0, 200, 255)); d.line([(mx, my - 5), (mx, my + 5)], fill=(0, 200, 255))
        if box:
            bx0 = ox + (box[0] - (cx - hf)) * sc; by0 = oy + (box[1] - (cy - hf)) * sc
            bx1 = ox + (box[2] + 1 - (cx - hf)) * sc; by1 = oy + (box[3] + 1 - (cy - hf)) * sc
            d.rectangle([max(ox, bx0), max(oy, by0), min(ox + T - 1, bx1), min(oy + T - 1, by1)], outline=(255, 220, 0))
S.save(out); print(out, S.size)
