r"""K863 J3l: split a tall PNG into pieces of at most <h> px (optionally scaled), for viewing at full size.
  venv\Scripts\python.exe -I work36\dbg\split_k863l.py <in.png> <out prefix> <h> [<scale>] [<x0,x1>]"""
import sys

from PIL import Image

src, pre, h = sys.argv[1], sys.argv[2], int(sys.argv[3])
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
im = Image.open(src).convert("RGB")
if len(sys.argv) > 5:
    x0, x1 = (int(v) for v in sys.argv[5].split(","))
    im = im.crop((x0, 0, x1, im.height))
n = 0
for y in range(0, im.height, h):
    p = im.crop((0, y, im.width, min(im.height, y + h)))
    if sc != 1.0:
        p = p.resize((int(p.width * sc), int(p.height * sc)), Image.LANCZOS)
    p.save(f"{pre}_{n}.png")
    n += 1
print(n, "pieces", im.width, "x", im.height)
