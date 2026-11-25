# K1588 s1: sheets of slit.py's hard finds ('!'): each tile is before | after, HALF px each way round the find
# (the find is the centre pixel; red ticks on the tile's top and left edges point at it), nearest-neighbour at SC,
# levels 16..40 stretched to the full range (these mazes' fills are dark).
#   python slitsheet.py <slit_j3.txt> <beforeRoot> <afterRoot> <outPrefix> [half=9] [sc=12] [cols=4] [rows=4]
import sys, re, os
from PIL import Image, ImageDraw
txt, br, ar, outp = sys.argv[1:5]
HALF = int(sys.argv[5]) if len(sys.argv) > 5 else 9
SC = int(sys.argv[6]) if len(sys.argv) > 6 else 12
COLS = int(sys.argv[7]) if len(sys.argv) > 7 else 4
ROWS = int(sys.argv[8]) if len(sys.argv) > 8 else 4
finds = []
for ln in open(txt, encoding='utf-8', errors='replace').read().replace('\x00', '').splitlines():
    m = re.match(r'(\w+) (x\d+) (\S+) box (\d+) px', ln)
    if not m: continue
    for x, y in re.findall(r'(\d+),(\d+)!', ln): finds.append((m.group(1), m.group(2), m.group(3), int(x), int(y)))
cache = {}
def img(root, mz):
    k = (root, mz)
    if k not in cache: cache[k] = Image.open(os.path.join(root, mz, 'gf_b2.png')).convert('RGB')
    return cache[k]
N = 2 * HALF + 1; T = N * SC; CW = 2 * T + 6 + 10; RH = T + 16 + 6
per = COLS * ROWS
for s in range(0, len(finds), per):
    sh = Image.new('RGB', (COLS * CW, ROWS * RH), (90, 90, 90)); d = ImageDraw.Draw(sh)
    for i, (mz, xs, site, x, y) in enumerate(finds[s:s + per]):
        cx = (i % COLS) * CW; cy = (i // COLS) * RH
        d.text((cx + 2, cy + 2), f'{s + i + 1} {mz} {xs} {site} {x},{y}', fill=(255, 255, 255))
        for j, root in enumerate((br, ar)):
            # levels 16..40 stretched to 0..255: on a dark fill (27 to 35) the ink (20) is otherwise hard to tell
            t = img(root, mz).crop((x - HALF, y - HALF, x + HALF + 1, y + HALF + 1)).point(lambda v: max(0, min(255, int((v - 16) * 255 / 24)))).resize((T, T), Image.NEAREST)
            ox = cx + j * (T + 6); oy = cy + 16
            sh.paste(t, (ox, oy))
            d.rectangle((ox + HALF * SC, oy - 3, ox + (HALF + 1) * SC - 1, oy - 1), fill=(255, 0, 0))
            d.rectangle((ox - 3, oy + HALF * SC, ox - 1, oy + (HALF + 1) * SC - 1), fill=(255, 0, 0))
    o = f'{outp}_{s // per + 1}.png'; sh.save(o); print(o, sh.size, len(finds[s:s + per]))
print('finds', len(finds))
