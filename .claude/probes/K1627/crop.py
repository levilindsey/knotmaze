# K1627 s1: side-by-side crops of several captures at one spot, nearest-neighbour at --scale, labelled.
#   python crop.py <out.png> <x> <y> <half> <scale> <img1> [<img2> ...]   (an img is <path>[@label])
import sys
from PIL import Image, ImageDraw
out, x, y, half, sc = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
tiles = []
for a in sys.argv[6:]:
    p, _, lab = a.partition('@')
    im = Image.open(p).convert('RGB')
    t = im.crop((x - half, y - half, x + half, y + half)).resize((2 * half * sc, 2 * half * sc), Image.NEAREST)
    d = ImageDraw.Draw(t); d.rectangle((0, 0, 8 * len(lab or p[-30:]) + 8, 16), fill=(0, 0, 0)); d.text((4, 2), lab or p[-30:], fill=(255, 255, 255))
    tiles.append(t)
W = sum(t.width for t in tiles) + 6 * (len(tiles) - 1)
S = Image.new('RGB', (W, tiles[0].height), (255, 255, 255))
o = 0
for t in tiles:
    S.paste(t, (o, 0)); o += t.width + 6
S.save(out)
