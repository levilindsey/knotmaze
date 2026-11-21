# K1482 s43: paste a mirror window (top-left device x0, y0) into a copy of a full frame, so stage 39's place39.py
# can lay it out. Only the window is the mirror; keep place39's tiles (RW, RC) inside it.
#   python frame43.py <frame.png> <window.png> <x0> <y0> <out.png>
import sys
from PIL import Image

f, w, x0, y0, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
F = Image.open(f).convert("RGB"); F.paste(Image.open(w).convert("RGB"), (x0, y0)); F.save(out)
print(out)
