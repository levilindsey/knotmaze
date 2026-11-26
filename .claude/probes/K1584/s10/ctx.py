# K1584 s10: quick context crops (raw gf_b2 and gf colour) around a device point, several captures side by side.
#   python ctx.py <out.png> <maze> <x> <y> <half> <scale> <label=dir{m}>...
import sys, os
from PIL import Image, ImageDraw
out, m, x, y, H, S = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
cols = [a.split('=', 1) for a in sys.argv[7:]]
x0, y0 = int(round(x)) - H, int(round(y)) - H
tiles = []
for lab, d in cols:
    for f in ('gf_b2.png', 'gf.png'):
        p = os.path.join(d.replace('{m}', m), f)
        if not os.path.exists(p): p = os.path.join(d.replace('{m}', m), 'gf_b2.png')
        im = Image.open(p).convert('RGB').crop((x0, y0, x0 + 2 * H, y0 + 2 * H)).resize((2 * H * S, 2 * H * S), Image.NEAREST)
        D = ImageDraw.Draw(im); cx, cy = (x - x0) * S, (y - y0) * S; D.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=(255, 0, 0))
        D.text((4, 4), lab + ' ' + f, fill=(255, 0, 0)); tiles.append(im)
W = 2 * H * S; sh = Image.new('RGB', (len(cols) * W + (len(cols) - 1) * 4, 2 * W + 4), (40, 40, 40))
for i in range(len(cols)):
    sh.paste(tiles[2 * i], (i * (W + 4), 0)); sh.paste(tiles[2 * i + 1], (i * (W + 4), W + 4))
sh.save(out); print(out, sh.size)
