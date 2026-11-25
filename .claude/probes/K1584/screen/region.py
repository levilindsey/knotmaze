# K1584: one region of a capture, enlarged, in the sheets' tone map, with optional crossing numbers and marks.
#   python region.py <out> <capDir> <x0,y0,x1,y1> <scale> [--json <maze.json> --cap <index> --num --mark]
# --num writes each crossing's number at its centre; --mark rings the sides still closed (red) or short (orange)
# on screen in capture <index> of the screen.py JSON.
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
out, cap, box, sc = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')], int(sys.argv[4])
a = sys.argv[5:]
js = a[a.index('--json') + 1] if '--json' in a else None
ci = int(a[a.index('--cap') + 1]) if '--cap' in a else 0
x0, y0, x1, y1 = box
g = np.asarray(Image.open(cap + r'\gf_b2.png').convert('L')).astype(np.float32)[y0:y1, x0:x1]
t = np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)
im = Image.fromarray(t).resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.LANCZOS if sc <= 3 else Image.NEAREST).convert('RGB')
d = ImageDraw.Draw(im)
try: fnt = ImageFont.truetype('arialbd.ttf', 15)
except Exception: fnt = ImageFont.load_default()
if js:
    S = json.load(open(js))['sides']; by = {}
    for s in S:
        if s.get('at'): by.setdefault(s['i'], []).append(s)
    for i, ss in by.items():
        cx = sum(s['at'][0] for s in ss) / len(ss); cy = sum(s['at'][1] for s in ss) / len(ss)
        if not (x0 <= cx < x1 and y0 <= cy < y1): continue
        if '--mark' in a:
            for s in ss:
                v = s['scr'][ci]['v']
                if v in ('closed', 'part'):
                    px = (s['at'][0] - x0) * sc; py = (s['at'][1] - y0) * sc; r = 9 * sc
                    d.ellipse([px - r, py - r, px + r, py + r], outline=(230, 40, 40) if v == 'closed' else (240, 150, 0), width=3)
        if '--num' in a:
            px = (cx - x0) * sc; py = (cy - y0) * sc; tx = str(i)
            w = d.textlength(tx, font=fnt)
            d.rectangle([px - w / 2 - 3, py - 10, px + w / 2 + 3, py + 9], fill=(255, 235, 120))
            d.text((px - w / 2, py - 9), tx, fill=(0, 0, 0), font=fnt)
im.save(out, quality=88); print(out, im.size)
