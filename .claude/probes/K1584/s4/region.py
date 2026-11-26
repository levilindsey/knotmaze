# K1584 s4: one frame region of two captures at a scale, stacked (before above, after below), labelled.
#   python region.py <beforeDir> <afterDir> x0 y0 x1 y1 scale out.png [labelB] [labelA]
import sys
from PIL import Image, ImageDraw, ImageFont
b, a = sys.argv[1], sys.argv[2]; x0, y0, x1, y1, sc = map(int, sys.argv[3:8]); out = sys.argv[8]
lb = sys.argv[9] if len(sys.argv) > 9 else 'stage 3'; la = sys.argv[10] if len(sys.argv) > 10 else 'stage 4'
try: F = ImageFont.truetype('arial.ttf', 18)
except Exception: F = ImageFont.load_default()
w, h = (x1 - x0) * sc, (y1 - y0) * sc
S = Image.new('RGB', (w, 2 * h + 56), (40, 0, 60)); dr = ImageDraw.Draw(S)
for j, (d, nm) in enumerate([(b, lb), (a, la)]):
    I = Image.open(d + '/gf_b2.png').convert('RGB').crop((x0, y0, x1, y1)).resize((w, h), Image.NEAREST)
    oy = j * (h + 28); S.paste(I, (0, oy + 28)); dr.text((6, oy + 4), f'{nm}  x {x0}..{x1}  y {y0}..{y1}  at {sc}x', fill=(255, 255, 0), font=F)
S.save(out); print(out, S.size)
