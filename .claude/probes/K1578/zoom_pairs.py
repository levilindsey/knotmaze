# Closer pairs (start | candidate, brightened, nearest-neighbour) of named places of an allmaze run.
#   python ball40_zoom.py <run out dir> <out png> <half window px> <zoom> <maze:x,y:label>...
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

run, out, R, Z = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
LO, K, G = 14, 7, 8
cells = []
for a in sys.argv[5:]:
    maze, xy, lab = a.split(':')
    x, y = map(int, xy.split(','))
    pair = []
    for tag in ('m', 'c'):
        v = np.asarray(Image.open(os.path.join(run, 'raw', tag, maze, 'gf_b2.png')).convert('RGB')).astype(np.int16)
        im = Image.fromarray(np.clip((v - LO) * K, 0, 255).astype(np.uint8))
        pair.append(im.crop((x - R, y - R, x + R, y + R)).resize((2 * R * Z, 2 * R * Z), Image.NEAREST))
    c = Image.new('RGB', (2 * pair[0].size[0] + G, 22 + pair[0].size[1]), (255, 255, 255))
    c.paste(pair[0], (0, 22))
    c.paste(pair[1], (pair[0].size[0] + G, 22))
    ImageDraw.Draw(c).text((4, 5), '%s %d,%d %s: start | candidate (%d px window, x%d)' % (maze, x, y, lab, 2 * R, Z), fill=(0, 0, 0))
    cells.append(c)
COLS = 2
cw, ch = cells[0].size
rows = (len(cells) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * cw + (COLS - 1) * 16, rows * ch), (255, 255, 255))
for i, c in enumerate(cells):
    sheet.paste(c, ((i % COLS) * (cw + 16), (i // COLS) * ch))
sheet.save(out)
print(out, sheet.size)
