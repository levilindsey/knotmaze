import sys
import numpy as np
from PIL import Image

# python dccrop.py <dcf dir> <stop> <x0> <y0> <x1> <y1> <out.png> : dragged page | fresh load | differing px, 4x
d, s = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
a = Image.open(f"{d}/drag_gfh_{s}.png").convert("RGB").crop((x0, y0, x1, y1))
b = Image.open(f"{d}/dragref_gfh_{s}.png").convert("RGB").crop((x0, y0, x1, y1))
na, nb = np.asarray(a).astype(int), np.asarray(b).astype(int)
m = np.abs(na - nb).max(axis=2) > 24
print("px over 24 in the box:", int(m.sum()))
dm = Image.fromarray((m * 255).astype("uint8")).convert("RGB")
sc = 4
w, h = a.size
sheet = Image.new("RGB", (w * sc * 3 + 20, h * sc), (90, 90, 90))
for i, im in enumerate((a, b, dm)):
    sheet.paste(im.resize((w * sc, h * sc), Image.NEAREST), (i * (w * sc + 10), 0))
sheet.save(sys.argv[7])
print("wrote", sys.argv[7])
