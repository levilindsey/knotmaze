# K1482 s16: side-by-side 4x crops (levels stretched x6 from 14: ink black, the mottled interior grey) of several frames around points, one row per point, with labels.
#   python sheet16.py <out.png> <R> <x,y[,name];x,y[,name];...> <label=frame.png> [label=frame.png ...]
import sys
from PIL import Image, ImageDraw
out, R, pts = sys.argv[1], int(sys.argv[2]), sys.argv[3]
frames = [a.split("=", 1) for a in sys.argv[4:]]
ims = [(lab, Image.open(f).convert("RGB")) for lab, f in frames]
Z = int(__import__('os').environ.get('Z', '4'))
rows = []
for spec in pts.split(";"):
    p = spec.split(",")
    rows.append((int(p[0]), int(p[1]), p[2] if len(p) > 2 else f"{p[0]}:{p[1]}"))
W = 2 * R + 1
cw, ch = W * Z, W * Z
sheet = Image.new("RGB", (len(ims) * (cw + 6) + 6, len(rows) * (ch + 22) + 6), (255, 255, 255))
d = ImageDraw.Draw(sheet)
for r, (x, y, name) in enumerate(rows):
    for c, (lab, im) in enumerate(ims):
        crop = im.crop((x - R, y - R, x + R + 1, y + R + 1)).point(lambda v: max(0, min(255, (v - 14) * 6))).resize((cw, ch), Image.NEAREST)
        X, Y = 6 + c * (cw + 6), 6 + r * (ch + 22)
        sheet.paste(crop, (X, Y + 16))
        d.text((X, Y), f"{name} {lab}", fill=(0, 0, 0))
        d.rectangle((X + R * Z, Y + 16 + R * Z, X + R * Z + Z - 1, Y + 16 + R * Z + Z - 1), outline=(255, 0, 0))
sheet.save(out)
print(out)
