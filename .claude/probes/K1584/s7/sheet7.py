# K1584 s7: crop sheets in region.py's tone map. Columns are captures named by tag; the last column (optional) is the
# raw-luminance diff of two of them (red = lighter in the second, i.e. a cut opened; green = darker, ink restored).
#   python sheet7.py <out.png> <scale> <half> <cols> [--diff a,b] <place> ...
# cols: comma list of tags: today s4 s5 s6 s7 (s7 = s7/out/s7a). place: maze:x<idx>[:dx:dy] (the crossing's dev point
# from s5/cnt), maze:k<idx> (stage 6's tight ball), maze:@:X:Y[:label] (capture px). Each crop gets a cyan cross at its
# place and, with --box x0,y0,x1,y1 per place (maze:@:X:Y:label:x0;y0;x1;y1), a yellow box.
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
K = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DIRS = {'today': r's1\out\before', 's4': r's4\out\s4g', 's5': r's5\out\s5d', 's6': r's6\out\s6a', 's7': r's7\out\s7a'}
a = sys.argv[1:]
dif = None
if '--diff' in a:
    i = a.index('--diff'); dif = a[i + 1].split(','); del a[i:i + 2]
out, sc, hf, cols = a[0], int(a[1]), int(a[2]), a[3].split(',')
places = a[4:]
try: fnt = ImageFont.truetype('arialbd.ttf', 13)
except Exception: fnt = ImageFont.load_default()
_c, _t, _i = {}, {}, {}
def cnt(m):
    if m not in _c: _c[m] = {x['i']: x for x in json.load(open(os.path.join(K, 's5', 'cnt', f'{m}_s5d.json')))['crossings']}
    return _c[m]
def tight(m):
    if m not in _t: _t[m] = {b['k']: b for b in json.load(open(os.path.join(K, 's6', 'tight', m + '.json')))['tight']}
    return _t[m]
def img(tag, m):
    p = os.path.join(K, DIRS[tag], m, 'gf_b2.png')
    if p not in _i:
        x = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
        _i[p] = (299 * x[:, :, 0] + 587 * x[:, :, 1] + 114 * x[:, :, 2]) / 1000
    return _i[p]
def crop(g, cx, cy):
    c = np.zeros((2 * hf, 2 * hf), np.float32)
    y1, y2, x1, x2 = max(0, cy - hf), min(g.shape[0], cy + hf), max(0, cx - hf), min(g.shape[1], cx + hf)
    c[y1 - (cy - hf):y2 - (cy - hf), x1 - (cx - hf):x2 - (cx - hf)] = g[y1:y2, x1:x2]
    return c
def tone(c): return np.clip((c - 18) / 24 * 255, 0, 255).astype(np.uint8)
T = 2 * hf * sc; pad = 4; LH = 18; LW = 0
ncol = len(cols) + (1 if dif else 0)
S = Image.new('RGB', (ncol * (T + pad), len(places) * (T + LH + pad)), (40, 0, 40)); d = ImageDraw.Draw(S)
for r, pl in enumerate(places):
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
    y0 = r * (T + LH + pad); cs = {}
    for ci, tg in enumerate(cols):
        c = crop(img(tg, m), cx, cy); cs[tg] = c
        t = Image.fromarray(tone(c)).resize((T, T), Image.LANCZOS if sc <= 3 else Image.NEAREST).convert('RGB')
        S.paste(t, (ci * (T + pad), y0 + LH)); d.text((ci * (T + pad) + 2, y0 + 2), f'{m} {lab} {tg} ({cx},{cy})', fill=(255, 255, 0), font=fnt)
    if dif:
        A, B = crop(img(dif[0], m), cx, cy), crop(img(dif[1], m), cx, cy)
        g = tone(B) // 2; rgb = np.stack([g, g, g], -1)
        up, dn = (B - A) > 3, (B - A) < -3
        rgb[up] = (255, 40, 40); rgb[dn] = (40, 255, 40)
        t = Image.fromarray(rgb.astype(np.uint8), 'RGB').resize((T, T), Image.NEAREST)
        S.paste(t, (len(cols) * (T + pad), y0 + LH))
        d.text((len(cols) * (T + pad) + 2, y0 + 2), f'{dif[0]}->{dif[1]} +{int(up.sum())} -{int(dn.sum())}', fill=(255, 255, 0), font=fnt)
    for ci in range(ncol):
        ox = ci * (T + pad); oy = y0 + LH
        mx = ox + (X - (cx - hf)) * sc; my = oy + (Y - (cy - hf)) * sc
        d.line([(mx - 5, my), (mx + 5, my)], fill=(0, 200, 255)); d.line([(mx, my - 5), (mx, my + 5)], fill=(0, 200, 255))
        if box:
            bx0 = ox + (box[0] - (cx - hf)) * sc; by0 = oy + (box[1] - (cy - hf)) * sc
            bx1 = ox + (box[2] + 1 - (cx - hf)) * sc; by1 = oy + (box[3] + 1 - (cy - hf)) * sc
            d.rectangle([max(ox, bx0), max(oy, by0), min(ox + T - 1, bx1), min(oy + T - 1, by1)], outline=(255, 220, 0))
S.save(out); print(out, S.size)
