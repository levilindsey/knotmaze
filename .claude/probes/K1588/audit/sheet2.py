# close sheets at device resolution: today's render | mirror as built | mirror switched, per changed place
import json, sys, numpy as np
from PIL import Image, ImageDraw, ImageOps
d, v, out = sys.argv[1:4]; pts = [a.split('_') for a in sys.argv[4:]]
import os; PRE = os.environ.get('PRE', 'c'); LAB = os.environ.get('LAB', 'under kept in its junction'); Z = 3; PPW = 42.595; OX, OY = 1281 - PPW * 10.483, 783.9 - PPW * 15.216
def inkimg(M):
    n = M['w']; ink = np.array(M['ink']).reshape(n, n); cov = np.array(M['cov']).reshape(n, n)
    a = 28 + 62 * cov; a = a * (1 - ink) + 255 * ink; return Image.fromarray(a.astype(np.uint8)).convert('RGB')
GF = ImageOps.invert(Image.open(d + '/gf.png').convert('L')); rows = []
for t, (wx, wy, xi, npx) in enumerate(pts):
    B = json.load(open(f'{v}/{PRE}b{t + 1}.json')); H = json.load(open(f'{v}/{PRE}h{t + 1}.json')); n = B['w']
    cx, cy = OX + PPW * float(wx), OY + PPW * float(wy); g = ImageOps.autocontrast(GF.crop((int(cx) - n // 2, int(cy) - n // 2, int(cx) + n // 2, int(cy) + n // 2))).convert('RGB')
    ia, ib = np.array(B['ink']).reshape(n, n), np.array(H['ink']).reshape(n, n); nd = int((np.abs(ia - ib) > 0.25).sum()); ad = int(((ib - ia) > 0.25).sum())
    row = Image.new('RGB', (3 * n * Z + 20, n * Z + 22), (255, 255, 255)); Dr = ImageDraw.Draw(row)
    for k, (im, lab) in enumerate(((g, f'#{t + 1} near x{xi}: today (with gaps)'), (inkimg(B), 'same rules, no gaps drawn'), (inkimg(H), f'{LAB} ({nd} px differ, {ad} added)'))):
        row.paste(im.resize((n * Z, n * Z), Image.NEAREST), (k * (n * Z + 10), 22)); Dr.text((k * (n * Z + 10) + 4, 5), lab, fill=(0, 0, 0))
    rows.append(row)
for pg in range(0, len(rows), 4):
    part = rows[pg:pg + 4]; S = Image.new('RGB', (part[0].width, sum(r.height for r in part) + 8 * (len(part) - 1)), (255, 255, 255)); y = 0
    for r in part: S.paste(r, (0, y)); y += r.height + 8
    S.save(f'{out}_{pg // 4 + 1}.png'); print(f'{out}_{pg // 4 + 1}.png', S.size)
