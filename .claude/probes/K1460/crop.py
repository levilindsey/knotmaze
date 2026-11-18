# K1460: side-by-side zoom crops of fade.mjs shots (shot_<mode>_<fl>.png, DSF device px per css px).
#   python crop.py <out.png> <crop css> <zoom> "<x,y;...>" <dirA>:<mode>_<fl>[:label] ...
# Each row is one site, each column one shot. Nearest-neighbour upscale.
import sys
from PIL import Image, ImageDraw
out, crop, zoom, sites = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
DSF = 2
cols = []
for a in sys.argv[5:]:
    parts = a.split(":")
    if len(parts) >= 3 and len(parts[0]) == 1:  # drive letter
        parts = [parts[0] + ":" + parts[1]] + parts[2:]
    d, key = parts[0], parts[1]
    lab = parts[2] if len(parts) > 2 else key
    cols.append((Image.open(f"{d}/shot_{key}.png").convert("RGB"), lab))
pts = [tuple(map(float, s.split(","))) for s in sites.split(";")]
cell = crop * zoom
W = len(cols) * (cell + 4) + 4
H = len(pts) * (cell + 4) + 20
sheet = Image.new("RGB", (W, H), (34, 34, 34))
dr = ImageDraw.Draw(sheet)
for ci, (_, lab) in enumerate(cols):
    dr.text((4 + ci * (cell + 4), 4), lab, fill=(220, 220, 220))
for ri, (x, y) in enumerate(pts):
    for ci, (im, _) in enumerate(cols):
        box = (int((x - crop / 2) * DSF), int((y - crop / 2) * DSF), int((x + crop / 2) * DSF), int((y + crop / 2) * DSF))
        c = im.crop(box).resize((cell, cell), Image.NEAREST)
        sheet.paste(c, (4 + ci * (cell + 4), 20 + ri * (cell + 4)))
    dr.text((6, 22 + ri * (cell + 4)), f"{int(x)},{int(y)}", fill=(255, 255, 0))
sheet.save(out)
print("wrote", out)
