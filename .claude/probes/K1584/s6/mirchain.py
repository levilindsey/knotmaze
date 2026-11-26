# K1584 s6: a mir.ts dump coloured by the top chain (cov > 0.5), ink darkened, the tight corners ringed.
#   python mirchain.py <m.json> <maze> <scale> <out.png>
import json, sys, colorsys
from PIL import Image, ImageDraw, ImageFont
M = json.load(open(sys.argv[1])); m = sys.argv[2]; sc = int(sys.argv[3]); out = sys.argv[4]
TJ = json.load(open(__file__.replace('mirchain.py', r'tight\%s.json' % m)))
n = M['w']; I = Image.new('RGB', (n, n), (20, 20, 20)); seen = {}
for k in range(n * n):
    c = M['chain'][k]; cv = M['cov'][k]; ik = M['ink'][k]
    if cv > 0.5 and c >= 0:
        col = tuple(int(255 * v) for v in colorsys.hsv_to_rgb((c * 0.137) % 1, 0.6, 0.9)); seen.setdefault(c, (k % n, k // n))
    else: col = (200, 200, 200)
    if ik > 0.3: col = tuple(int(v * (1 - 0.8 * min(1, ik))) for v in col)
    I.putpixel((k % n, k // n), col)
I = I.resize((n * sc, n * sc), Image.NEAREST); D = ImageDraw.Draw(I)
try: fnt = ImageFont.truetype('arialbd.ttf', 13)
except Exception: fnt = ImageFont.load_default()
for c, (x, y) in seen.items(): D.text((x * sc, y * sc), 'c%d' % c, fill=(0, 0, 0), font=fnt)
for b in TJ['tight']:
    px, py = (b['c'][0] - M['x0']) / M['step'] * sc, (b['c'][1] - M['y0']) / M['step'] * sc
    if 0 <= px < n * sc and 0 <= py < n * sc:
        R = (b['r'] + TJ['W']) / M['step'] * sc
        D.ellipse((px - R, py - R, px + R, py + R), outline=(255, 0, 0)); D.ellipse((px - 2, py - 2, px + 2, py + 2), fill=(255, 0, 0))
        D.text((px + 4, py - 14), 'k%d' % b['k'], fill=(255, 0, 0), font=fnt)
I.save(out); print(out, I.size)
