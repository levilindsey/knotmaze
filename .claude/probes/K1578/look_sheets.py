# The coordinator's all-maze look at a candidate: contact sheets of every place in an allmaze run's places.txt,
# cut from the run's raw captures (base raw/m, candidate raw/c), brightened by place39's fixed stretch.
#   python ball40_look.py <run out dir> <out dir> [big px threshold=20]
# big_<n>.png: 4 places each: wide base | wide cand | close base | close cand | close cand with changed px red.
# small_<n>.png: 24 places each: base | cand | cand with changed px red (32 px window, x5).
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

run, out = sys.argv[1], sys.argv[2]
BIG = int(sys.argv[3]) if len(sys.argv) > 3 else 20
LO, K, STEP = 14, 7, 3
os.makedirs(out, exist_ok=True)

places = []
for ln in open(os.path.join(run, 'places.txt'), encoding='utf-8'):
    p = ln.rstrip('\r\n').split('\t')
    if len(p) < 7:
        continue
    x, y = map(int, p[1].split(','))
    places.append((p[0], x, y, int(p[2].split()[0]), p[5].replace('near ', '')))

cache = {}


def load(maze):
    if maze not in cache:
        cache.clear()
        B = np.asarray(Image.open(os.path.join(run, 'raw', 'm', maze, 'gf_b2.png')).convert('RGB')).astype(np.int16)
        C = np.asarray(Image.open(os.path.join(run, 'raw', 'c', maze, 'gf_b2.png')).convert('RGB')).astype(np.int16)
        assert B.shape == C.shape, (B.shape, C.shape)
        d = np.abs(B - C).max(axis=2)
        sb = np.clip((B - LO) * K, 0, 255).astype(np.uint8)
        sc = np.clip((C - LO) * K, 0, 255).astype(np.uint8)
        red = sc.copy()
        red[d >= STEP] = (255, 0, 0)
        cache[maze] = (Image.fromarray(sb), Image.fromarray(sc), Image.fromarray(red), d)
    return cache[maze]


def tile(im, x, y, R, Z):
    return im.crop((x - R, y - R, x + R, y + R)).resize((2 * R * Z, 2 * R * Z), Image.NEAREST)


def facts(maze, x, y, R=24):
    d = load(maze)[3]
    w = d[max(0, y - R):y + R, max(0, x - R):x + R]
    return int((w >= STEP).sum()), int(w.max())


def big_row(pl):
    maze, x, y, n, nm = pl
    B, C, Rd, _ = load(maze)
    WR, WZ, CR, CZ, G = 78, 2, 30, 5, 8
    tiles = [tile(B, x, y, WR, WZ), tile(C, x, y, WR, WZ), tile(B, x, y, CR, CZ), tile(C, x, y, CR, CZ), tile(Rd, x, y, CR, CZ)]
    for t in tiles[:2]:
        ImageDraw.Draw(t).rectangle(((WR - CR) * WZ, (WR - CR) * WZ, (WR + CR) * WZ, (WR + CR) * WZ), outline=(255, 0, 0))
    w = sum(t.size[0] for t in tiles) + G * (len(tiles) - 1)
    row = Image.new('RGB', (w, 22 + 312), (255, 255, 255))
    xx = 0
    for t in tiles:
        row.paste(t, (xx, 22))
        xx += t.size[0] + G
    k, mx = facts(maze, x, y)
    ImageDraw.Draw(row).text((4, 5), '%s %d,%d near %s: %d px listed (%d px in a 48 px window, largest step %d levels)   start | candidate, wide then close; last = candidate with changed px red'
                             % (maze, x, y, nm, n, k, mx), fill=(0, 0, 0))
    return row


def small_cell(pl):
    maze, x, y, n, nm = pl
    B, C, Rd, _ = load(maze)
    R, Z, G = 16, 5, 4
    cell = Image.new('RGB', (3 * 2 * R * Z + 2 * G, 20 + 2 * R * Z), (255, 255, 255))
    for i, im in enumerate((B, C, Rd)):
        cell.paste(tile(im, x, y, R, Z), (i * (2 * R * Z + G), 20))
    k, mx = facts(maze, x, y)
    ImageDraw.Draw(cell).text((3, 4), '%s %d,%d %s: %d px, largest step %d' % (maze, x, y, nm, n, mx), fill=(0, 0, 0))
    return cell


def save(name, im):
    im.save(os.path.join(out, name))
    print(name, im.size)


big = [p for p in places if p[3] >= BIG]
small = [p for p in places if p[3] < BIG]
print('places %d: big %d, small %d' % (len(places), len(big), len(small)))
for i in range(0, len(big), 4):
    rows = [big_row(p) for p in big[i:i + 4]]
    im = Image.new('RGB', (max(r.size[0] for r in rows), sum(r.size[1] for r in rows)), (255, 255, 255))
    y = 0
    for r in rows:
        im.paste(r, (0, y))
        y += r.size[1]
    save('big_%d.png' % (i // 4 + 1), im)
PER, COLS = 24, 3
for i in range(0, len(small), PER):
    cells = [small_cell(p) for p in small[i:i + PER]]
    cw, ch = cells[0].size
    nrow = (len(cells) + COLS - 1) // COLS
    im = Image.new('RGB', (COLS * cw + (COLS - 1) * 12, nrow * ch), (255, 255, 255))
    for j, c in enumerate(cells):
        im.paste(c, ((j % COLS) * (cw + 12), (j // COLS) * ch))
    save('small_%d.png' % (i // PER + 1), im)
print('largest step by place (levels of 255, 48 px window):')
line = []
for p in places:
    k, mx = facts(p[0], p[1], p[2])
    line.append('%s %s %d/%d' % (p[0], p[4], p[3], mx))
    if len(line) == 8:
        print('  ' + '; '.join(line))
        line = []
if line:
    print('  ' + '; '.join(line))
