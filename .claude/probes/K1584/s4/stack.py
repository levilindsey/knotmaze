# K1584 s4: stack tiles into one sheet, `cols` across.   python stack.py <out.png> <cols> tile.png ...
import sys
from PIL import Image
out, cols = sys.argv[1], int(sys.argv[2]); T = [Image.open(p).convert('RGB') for p in sys.argv[3:]]
w = max(t.width for t in T); h = max(t.height for t in T); rows = (len(T) + cols - 1) // cols
S = Image.new('RGB', (cols * w + (cols - 1) * 8, rows * h + (rows - 1) * 8), (20, 20, 20))
for i, t in enumerate(T): S.paste(t, ((i % cols) * (w + 8), (i // cols) * (h + 8)))
S.save(out); print(out, S.size)
