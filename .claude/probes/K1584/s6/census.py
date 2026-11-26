# K1584 s6: the census of balls in a crossing's gap, from ballink.py's json (captures today, s5d, s6a): a ball is in
# a gap when stage 5 took >= LOST px of today's ink inside its disk, or stage 6 differs from stage 5 there by >= LOST
# px. Writes the list and sheets of today | stage 5 | stage 6 (tone-mapped as region.py), two balls a row.
#   python census.py <ballink.json> <capT,capA,capB templates> <outPrefix> [--lost 3] [--force m:k,...]
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
B = json.load(open(sys.argv[1])); caps = sys.argv[2].split(','); op = sys.argv[3]
LOST = int(sys.argv[sys.argv.index('--lost') + 1]) if '--lost' in sys.argv else 3
force = set(sys.argv[sys.argv.index('--force') + 1].split(',')) if '--force' in sys.argv else set()
sel = []
for b in B:
    d56 = abs(b['ink'][2] - b['ink'][1])
    if b['lost'][1] >= LOST or d56 >= LOST or ('%s:%d' % (b['m'], b['k'])) in force:
        sel.append(dict(b, d56=b['ink'][2] - b['ink'][1]))
sel.sort(key=lambda b: (b['m'], b['k']))
json.dump(sel, open(op + '.json', 'w'))
print('balls in a gap', len(sel), 'of', len(B))
for b in sel: print('%s k%d j%d %.0f,%.0f R %.1f ink today/s5/s6 %s lost %s' % (b['m'], b['k'], b['j'], b['x'], b['y'], b['Rpx'], b['ink'], b['lost']))
try: fnt = ImageFont.truetype('arialbd.ttf', 13)
except Exception: fnt = ImageFont.load_default()
cache = {}
def img(p):
    if p not in cache: cache[p] = np.asarray(Image.open(p + r'\gf_b2.png').convert('L')).astype(np.float32)
    return cache[p]
HF, SC = 18, 4; S = 2 * HF * SC; PER, COLS = 16, 2
labs = ['today', 'stage 5', 'stage 6']
for pg in range(0, len(sel), PER):
    chunk = sel[pg:pg + PER]; rows = (len(chunk) + COLS - 1) // COLS
    cw = 3 * (S + 4) + 12; sh = Image.new('RGB', (COLS * cw, rows * (S + 20)), (30, 30, 30)); D = ImageDraw.Draw(sh)
    for i, b in enumerate(chunk):
        X = (i % COLS) * cw; Y = (i // COLS) * (S + 20); x, y = int(round(b['x'])), int(round(b['y']))
        D.text((X + 2, Y + 2), '#%d %s k%d j%d  %d,%d  d56 %+d' % (pg + i, b['m'], b['k'], b['j'], x, y, b['d56']), fill=(255, 255, 0), font=fnt)
        for c, t in enumerate(caps):
            a = img(t.replace('{m}', b['m']))[y - HF:y + HF, x - HF:x + HF]
            im = Image.fromarray(np.clip((a - 18) / 24 * 255, 0, 255).astype(np.uint8)).resize((S, S), Image.NEAREST).convert('RGB')
            dd = ImageDraw.Draw(im); r = b['Rpx'] * SC; c0 = (b['x'] - (x - HF)) * SC
            c1 = (b['y'] - (y - HF)) * SC
            if c == 0: dd.ellipse((c0 - r, c1 - r, c0 + r, c1 + r), outline=(255, 60, 60))
            dd.point((c0, c1), fill=(255, 60, 60))
            sh.paste(im, (X + c * (S + 4), Y + 18))
        D.text((X + 2, Y + 18 + S - 14), ' | '.join(labs), fill=(120, 200, 255), font=fnt)
    p = '%s_p%d.png' % (op, pg // PER); sh.save(p); print(p, sh.size)
