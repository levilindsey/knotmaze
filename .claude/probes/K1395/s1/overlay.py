# K1395 s1: draw overlay.mjs's chain states over shots: red = hidden (t < tStart), green = full, yellow = partial.
#   python overlay.py <prefix> <out.png> <img> [<img> ...]
import sys, json
from PIL import Image, ImageDraw

pre, out = sys.argv[1], sys.argv[2]
d = json.load(open(pre + ".json"))
col = {0: (255, 40, 40), 1: (40, 230, 40), 2: (255, 230, 0)}
tiles = []
for p in sys.argv[3:]:
    im = Image.open(p).convert("RGB")
    dr = ImageDraw.Draw(im)
    for c in d["chains"]:
        if not c:
            continue
        pts = c["pts"]
        xy = [(pts[i], pts[i + 1]) for i in range(0, len(pts), 2)]
        if len(xy) > 1:
            dr.line(xy, fill=col[c["st"]], width=1)
    tiles.append(im)
W, H = tiles[0].size
sheet = Image.new("RGB", (W * len(tiles) + 8 * (len(tiles) - 1), H), (255, 255, 255))
for i, t in enumerate(tiles):
    sheet.paste(t, (i * (W + 8), 0))
sheet.save(out)
