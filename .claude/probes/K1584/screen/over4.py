import json, sys, subprocess, os
from PIL import Image, ImageDraw
sp, g, o = sys.argv[1], sys.argv[2], sys.argv[3]
C = {p['n']: p for p in json.load(open(g + r'\s5\sweep\carve_places.json'))}
L = {p['n']: p for p in json.load(open(g + r'\s5\sweep\long_places.json'))}
pick = [('l', 50), ('l', 88), ('c', 454), ('c', 533)]
caps = [('today', r'\s1\out\before', 0), ('last step', r'\s4\out\s4g', 1), ('now', r'\s5\out\s5d', 3)]
rows = []
for k, i in pick:
    p = (C if k == 'c' else L)[i]
    x, y, m = p['x'], p['y'], p['m']
    box = '%d,%d,%d,%d' % (max(0, x - 70), max(0, y - 55), x + 70, y + 55)
    tiles = []
    for lab, d, ci in caps:
        f = o + r'\ov_%s%d_%d.png' % (k, i, ci)
        subprocess.check_call([sys.executable, sp + r'\region.py', f, g + d + '\\' + m, box, '6', '--json', sp + r'\t4\%s.json' % m, '--cap', str(ci), '--num'])
        tiles.append((lab, Image.open(f).convert('RGB')))
    rows.append(('%s%d %s x%s  at %.0f,%.0f' % (k, i, m, p.get('xi', '?'), x, y), tiles))
W = sum(t.size[0] for _, t in rows[0][1]) + 8 * 2
H = sum(r[1][0][1].size[1] + 22 for r in rows)
im = Image.new('RGB', (W, H), (40, 40, 40)); dr = ImageDraw.Draw(im); yy = 0
for title, tiles in rows:
    xx = 0
    for lab, t in tiles:
        dr.text((xx + 4, yy + 4), title + '  |  ' + lab, fill=(255, 220, 90))
        im.paste(t, (xx, yy + 22)); xx += t.size[0] + 8
    yy += tiles[0][1].size[1] + 22
im.save(o + r'\over4.png'); print(im.size)
