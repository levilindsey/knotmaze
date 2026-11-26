# K1584 s6: wedge.ts's balls as rows: capture A (tone-mapped) | model no gap | model stage 5 | model stage 6 | capture B
#   python wedgeview.py <wedge.json> <capA> <capB> <scale> <out.png> [k,k,...]
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
W = json.load(open(sys.argv[1])); cA, cB, sc, out = sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
only = set(int(v) for v in sys.argv[6].split(',')) if len(sys.argv) > 6 else None
gA = np.asarray(Image.open(cA + r'\gf_b2.png').convert('L')).astype(np.float32)
gB = np.asarray(Image.open(cB + r'\gf_b2.png').convert('L')).astype(np.float32) if cB != '-' else None
try: fnt = ImageFont.truetype('arialbd.ttf', 12)
except Exception: fnt = ImageFont.load_default()
rows = [b for b in W if only is None or b['k'] in only]
n = rows[0]['n'] if rows else 40; tile = n * sc
im = Image.new('RGB', (5 * (tile + 4) + 130, len(rows) * (tile + 4) + 18), (40, 40, 40)); D = ImageDraw.Draw(im)
for t, lab in enumerate(['capture A', 'no gap', 'model s5', 'model s6', 'capture B']): D.text((130 + t * (tile + 4), 2), lab, fill=(255, 255, 0), font=fnt)
tm = lambda g: np.clip((g - 18) / 24 * 255, 0, 255).astype(np.uint8)
for r, b in enumerate(rows):
    y = 18 + r * (tile + 4); x0, y0 = b['x0'], b['y0']
    tiles = [tm(gA[y0:y0 + n, x0:x0 + n])]
    for key in ('ink0', 'ink5', 'ink6'):
        a = np.array(b[key], dtype=np.float32).reshape(n, n); tiles.append(np.clip((1 - a) * 200 + 20, 0, 255).astype(np.uint8))
    tiles.append(tm(gB[y0:y0 + n, x0:x0 + n]) if gB is not None else np.zeros((n, n), np.uint8))
    for t, a in enumerate(tiles):
        I = Image.fromarray(a).resize((tile, tile), Image.NEAREST).convert('RGB'); ImageDraw.Draw(I).ellipse((tile / 2 - 3, tile / 2 - 3, tile / 2 + 3, tile / 2 + 3), outline=(255, 0, 0))
        im.paste(I, (130 + t * (tile + 4), y))
    D.text((4, y + 4), 'k%d j%d\nc%d/c%d\n%.0f,%.0f' % (b['k'], b['j'], b['ca'], b['cb'], b['dev'][0], b['dev'][1]), fill=(255, 255, 255), font=fnt)
im.save(out); print(out, im.size, len(rows))
