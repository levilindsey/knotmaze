# side by side: Levi's crop (gf.png, inverted, dev+25, r 80) | mirror ink (inverted) | mirror term colours; 3x
#   python mirpair.py <capDir> <cnt.json> <id> <m.json> <out.png>
import json, sys
from PIL import Image, ImageOps, ImageDraw
d, cj, xi, mj, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]
C = {c['i']: c for c in json.load(open(cj))['crossings']}[xi]; U, O = C['under'], C['over']
M = json.load(open(mj)); n = M['w']; S = 3
cx, cy = C['dev'][0], C['dev'][1] + 25
g = Image.open(d + '/gf.png').convert('L').crop((int(cx) - 80, int(cy) - 80, int(cx) + 80, int(cy) + 80))
g = ImageOps.autocontrast(ImageOps.invert(g))
I = Image.new('L', (n, n)); J = Image.new('RGB', (n, n))
KC = {2: (255, 60, 60), 3: (60, 255, 60), 4: (255, 200, 0), 5: (60, 140, 255)}
for k in range(n * n):
    p = (k % n, k // n); ink = M['ink'][k]
    I.putpixel(p, int(255 * ink) if ink > 0.05 else int(90 * M['cov'][k]))
    if ink > 0.3:
        wk, wa = M['wk'][k], M['wa'][k]
        col = KC.get(wk, (255, 0, 255))
        if wk == 1: col = (0, 230, 255) if wa == U else ((255, 80, 220) if wa == O else (210, 210, 210))
        J.putpixel(p, col)
    else: J.putpixel(p, (0, 0, 0) if M['cov'][k] < 0.5 else (40, 40, 60))
W = n * S; out_im = Image.new('RGB', (3 * W + 12, W + 18), (40, 0, 40))
for i, im in enumerate((g.convert('RGB'), I.convert('RGB'), J)): out_im.paste(im.resize((W, W), Image.NEAREST), (i * (W + 6), 18))
D = ImageDraw.Draw(out_im); D.text((4, 2), f'x{xi} u{U} o{O}: gf.png s4 (inv) | mirror ink | term: cyan=u side, magenta=o side, grey=other side, red=arc, yellow=tangent, green=cap, blue=K1049', fill=(255, 255, 0))
out_im.save(out); print(out, out_im.size)
