import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
S = r'C:\Users\lsl\AppData\Local\Temp\claude\C--Users-lsl-Repositories-knotmaze\09c7a672-a414-402a-97da-b3176839a2e5\scratchpad'
A19 = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a5d6861178992f9ee\.claude\probes\K1482\out\s19\raw'
A18 = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a077003d003b40d70\.claude\probes\K1482\out\s18\raw'
sites = {s['site']: (s['x'], s['y']) for s in json.load(open(A19 + r'\tip\sites_gf.json'))['sites']}
W, D, T = 168, 56, 400
font = ImageFont.truetype('arial.ttf', 17)
_cache = {}
def load(p):
    if p not in _cache:
        im = Image.open(p).convert('RGB'); a = np.asarray(im).astype(float)
        _cache[p] = (im, np.percentile(a, 1), np.percentile(a, 99.5))
    return _cache[p]
def crop(p, cx, cy, box):
    im, lo, hi = load(p)
    x0, y0 = int(round(cx - box / 2)), int(round(cy - box / 2))
    a = np.asarray(im.crop((x0, y0, x0 + box, y0 + box))).astype(float)
    return Image.fromarray(np.clip((a - lo) * 255 / (hi - lo), 0, 255).astype('uint8')), x0, y0
def sheet(name, cols, rows):
    # cols: [(label, path)] (two); rows: [(label, cx, cy)]; per row: context A | context B | detail A | detail B
    cw = T * 4 + 24; ch = T + 28
    sh = Image.new('RGB', (cw, len(rows) * ch + (len(rows) - 1) * 10), (255, 255, 255))
    for r, (lab, cx, cy) in enumerate(rows):
        oy = r * (ch + 10)
        for c, (cl, p) in enumerate(cols):
            ctx, x0, y0 = crop(p, cx, cy, W); ctx = ctx.resize((T, T), Image.LANCZOS)
            k = T / W; bx, by = (cx - D / 2 - x0) * k, (cy - D / 2 - y0) * k
            ImageDraw.Draw(ctx).rectangle((bx, by, bx + D * k, by + D * k), outline=(255, 60, 60), width=2)
            det, _, _ = crop(p, cx, cy, D); det = det.resize((T, T), Image.NEAREST)
            ImageDraw.Draw(det).rectangle((0, 0, T - 1, T - 1), outline=(255, 60, 60), width=2)
            xs = [c * (T + 8), 2 * (T + 8) + c * (T + 8)]
            sh.paste(ctx, (xs[0], oy + 28)); sh.paste(det, (xs[1], oy + 28))
            d = ImageDraw.Draw(sh)
            d.text((xs[0], oy + 5), f'{lab}: {cl}', fill=(20, 20, 40), font=font)
            d.text((xs[1], oy + 5), f'{cl}, red box at 7x', fill=(20, 20, 40), font=font)
    sh.save(S + '\\' + name + '.png', optimize=True); print(name, sh.size)

sheet('k1522_u19', [('today', A19 + r'\start\gf.png'), ('joined', A19 + r'\u19a\gf.png')],
      [('j29', 1679, 759), ('x161', 1452, 977), ('x224', 2137, 634), ('x104', 1935, 590), ('x289', 1920, 920)])
sheet('k1522_w19', [('today', A19 + r'\start\gf.png'), ('joined', A19 + r'\w19a\gf.png')],
      [('j49', 1829, 1602), ('j20', 1085, 1197), ('t61s', 1097, 938), ('t75s', 1563, 1258), ('t47e', 1439, 257), ('j50', 1727, 1554)])
sheet('k1521_fl12', [('before, fade 1.2', A18 + r'\fls_start\gf_fls1.2.png'), ('today, fade 1.2', A18 + r'\fls_tip\gf_fls1.2.png')],
      [('c1', 1626, 414), ('c2', 2145, 483), ('c3', 2082, 1386)])
sheet('k1515', [("today's renderer", S + r'\today_cap\today.png'), ('distance render', A19 + r'\tip\gf.png')],
      [(n, *sites[n]) for n in ['j55', 'j36', 'j87', 't16e', 't2s']])
