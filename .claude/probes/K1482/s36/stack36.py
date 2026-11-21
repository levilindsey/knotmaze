# K1482 s36: stack sheets (sheet36.py's, one per maze) under one another, each under a title line.
#   python stack36.py <out.png> <title=png> [<title=png> ...]      (env MAXW=1800: fails if a sheet is wider)
import os, sys
from PIL import Image, ImageDraw
out, *parts = sys.argv[1:]
MAXW = int(os.environ.get("MAXW", 1800))
P = [(p.rsplit("=", 1)[0], Image.open(p.rsplit("=", 1)[1]).convert("RGB")) for p in parts]  # the title may hold "="
w = max(im.width for _, im in P)
assert w <= MAXW, f"sheet {w} px wide, over {MAXW}"
sheet = Image.new("RGB", (w, sum(im.height + 18 for _, im in P)), (255, 255, 255))
dr = ImageDraw.Draw(sheet); y = 0
for t, im in P:
    dr.rectangle((0, y, w, y + 16), fill=(232, 232, 240)); dr.text((4, y + 3), t, fill=(0, 0, 0))
    sheet.paste(im, (0, y + 18)); y += im.height + 18
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
sheet.save(out); print(out, sheet.size)
