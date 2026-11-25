# K1584: sheet of crossing sides, one tile per capture, centred on the side's gap stretch (0.03 <= e <= 0.08).
#   python sheet.py <out.png> <capA,capB,...> <labels> <perRow> <maze|json|i|dir|lat> ...   (cap = dir template with {m})
# Fixed tone map (lum 18 -> black, 42 -> white), so tiles compare across captures. A yellow tick marks the side.
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
out = sys.argv[1]; caps = sys.argv[2].split(','); labs = sys.argv[3].split(','); per = int(sys.argv[4]); items = sys.argv[5:]
SC = int(os.environ.get('SC', 5)); HF = int(os.environ.get('HF', 26)); T = 2 * HF * SC; PAD = 4; HD = 16
cache = {}; jc = {}
def img(p):
    if p not in cache: cache[p] = np.asarray(Image.open(p).convert('L')).astype(np.float32)
    return cache[p]
def side(j, i, d, l):
    if j not in jc: jc[j] = json.load(open(j))
    for s in jc[j]['sides']:
        if s['i'] == i and s['dir'] == d and s['lat'] == l: return s
    raise SystemExit('no side ' + str((j, i, d, l)))
n = len(items); rows = (n + per - 1) // per; CW = len(caps) * (T + PAD) + 10
S = Image.new('RGB', (per * CW, rows * (T + HD + PAD)), (60, 60, 60)); dr = ImageDraw.Draw(S)
for k, it in enumerate(items):
    m, j, i, d, l = it.split('|')
    if j == '@':   # raw place: maze|@|x|y|label
        s = {'scr': []}; cx, cy = int(round(float(i))), int(round(float(d))); raw = l
    else:
        i = int(i); d = int(d); l = int(l); raw = None
        s = side(j, i, d, l); cx, cy = int(round(s['at'][0])), int(round(s['at'][1]))
    x0 = (k % per) * CW; y0 = (k // per) * (T + HD + PAD)
    for c, cap in enumerate(caps):
        a = img(cap.replace('{m}', m) + r'\gf_b2.png')
        t = np.full((2 * HF, 2 * HF), 30, np.float32)
        y1, y2, x1, x2 = max(0, cy - HF), min(a.shape[0], cy + HF), max(0, cx - HF), min(a.shape[1], cx + HF)
        t[y1 - (cy - HF):y2 - (cy - HF), x1 - (cx - HF):x2 - (cx - HF)] = a[y1:y2, x1:x2]
        t = np.clip((t - 18) / 24 * 255, 0, 255).astype(np.uint8)
        tl = Image.fromarray(t).resize((T, T), Image.NEAREST).convert('RGB')
        xx = x0 + c * (T + PAD); S.paste(tl, (xx, y0 + HD))
        v = s['scr'][c] if c < len(s['scr']) else {'v': '?', 'gap': None}
        dr.text((xx + 2, y0 + 2), (f"{m} {raw} {labs[c]}" if raw is not None else f"{m} x{i} {d:+d}{l:+d} {labs[c]}: {v['v']} {v['gap']}"), fill=(255, 255, 120))
        mx = xx + T // 2; my = y0 + HD + T // 2
        dr.ellipse([mx - 14, my - 14, mx + 14, my + 14], outline=(255, 200, 0))
S.save(out); print(out, S.size)
