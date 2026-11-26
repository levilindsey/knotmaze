# K1627 s1: a sheet, one row per place, one column per capture: nearest-neighbour crops at --scale, labelled, a thin
# red ring at the place's centre in every crop. Captures are path templates with {m} for the place's maze.
#   python rows.py <places.json> <out.png> [--half 16] [--scale 10] [--only 1,2] [--ring 0] <tmpl>@<label> ...
import sys, json
from PIL import Image, ImageDraw
a = sys.argv[1:]
def opt(n, d):
    if n in a:
        i = a.index(n); v = a[i + 1]; del a[i:i + 2]; return v
    return d
half = int(opt('--half', 16)); sc = int(opt('--scale', 10)); only = opt('--only', ''); ring = int(opt('--ring', 1))
P = json.load(open(a[0])); out = a[1]; cols = a[2:]
if only: keep = [int(v) for v in only.split(',')]; P = [p for p in P if p['n'] in keep]
cache = {}
rows = []
for p in P:
    tiles = []
    for c in cols:
        t, _, lab = c.partition('@'); path = t.replace('{m}', p['m'])
        if path not in cache: cache[path] = Image.open(path).convert('RGB')
        im = cache[path]; x, y = p.get('cx', p['x']), p.get('cy', p['y'])
        T = im.crop((x - half, y - half, x + half, y + half)).resize((2 * half * sc, 2 * half * sc), Image.NEAREST)
        d = ImageDraw.Draw(T)
        if ring: r = 7 * sc; d.ellipse((half * sc - r, half * sc - r, half * sc + r, half * sc + r), outline=(255, 0, 0), width=2)
        s = '%s %s #%d (%d,%d)' % (lab, p['m'], p['n'], x, y)
        d.rectangle((0, 0, 7 * len(s) + 8, 14), fill=(0, 0, 0)); d.text((4, 1), s, fill=(255, 255, 255))
        tiles.append(T)
    rows.append(tiles)
tw = 2 * half * sc; g = 6
S = Image.new('RGB', (len(cols) * (tw + g) - g, len(rows) * (tw + g) - g), (255, 255, 255))
for r, tiles in enumerate(rows):
    for c, T in enumerate(tiles): S.paste(T, (c * (tw + g), r * (tw + g)))
S.save(out)
print(out, S.size)
