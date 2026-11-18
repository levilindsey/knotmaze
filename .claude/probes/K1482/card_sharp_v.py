# K1482 s4 item 0: the sharp-V card for Levi. Six link A sites at 4x on master (3b524da2), each crop centred on the
# spot where two outlines converge at a sharp V, circled.  python card_sharp_v.py <sites.json> <gf.png> <out.png>
import json, sys
from PIL import Image, ImageDraw
sites, frame, out = sys.argv[1:4]
R, Z, LO, K = 24, 4, 14, 7
SPOTS = [("j15", -2.5, 20.5, "dark wedge"), ("t23e", -13, -11, "dark wedge"), ("t73e", -12, 4, "dark wedge"),
         ("j158", -15, 8, "dark wedge"), ("j95", -2.5, 27.5, "light sliver"), ("j147", 8, -32, "light sliver")]
by = {s["site"]: s for s in json.load(open(sites))["sites"]}
im = Image.open(frame).convert("RGB").point(lambda v: max(0, min(255, round((v - LO) * K))))
T = 2 * R * Z; cols = 3; pad = 16; head = 28
sheet = Image.new("RGB", (cols * (T + pad) + pad, 2 * (T + head + pad) + 40), "white"); d = ImageDraw.Draw(sheet)
d.text((pad, 8), "Two outlines meeting at a sharp V (master, 4x). Fault, or gf's border look?", fill="black")
for i, (nm, dx, dy, what) in enumerate(SPOTS):
    s = by[nm]; cx, cy = round(s["x"] + dx), round(s["y"] + dy)
    t = im.crop((cx - R, cy - R, cx + R, cy + R)).resize((T, T), Image.NEAREST)
    ox, oy = pad + (i % cols) * (T + pad), 40 + (i // cols) * (T + head + pad)
    d.text((ox, oy + 6), f"{nm}: {what}", fill=(180, 0, 0))
    sheet.paste(t, (ox, oy + head))
    c = (ox + T // 2, oy + head + T // 2); r = 13 * Z
    for w in range(3): d.ellipse((c[0] - r - w, c[1] - r - w, c[0] + r + w, c[1] + r + w), outline=(255, 40, 40))
sheet.save(out); print(out, sheet.size)


