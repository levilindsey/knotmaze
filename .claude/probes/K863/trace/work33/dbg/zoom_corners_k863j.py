import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
boxes = [(1270, 80, 1770, 300), (2381, 80, 2881, 300), (1290, 2080, 1790, 2300), (2401, 2080, 2901, 2300)]
tiles = [im.crop(b).resize((1000, 440), Image.NEAREST) for b in boxes]
sheet = Image.new("RGB", (1000, 440 * 4 + 30), "white")
for i, t in enumerate(tiles):
    sheet.paste(t, (0, i * (440 + 10)))
sheet.save(out)
print(im.size, "->", sheet.size)
