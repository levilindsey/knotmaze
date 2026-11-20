# K1529 (27B): 4x side-by-side crops with surroundings.
#   python .claude/probes/K1529/crop4x.py <out.png> <cx> <cy> <half> <pngA> <pngB> [pngC]
# Crops (cx-half..cx+half, cy-half..cy+half) device px from each input and upscales 4x (nearest).
import sys
from PIL import Image

out, cx, cy, half = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
tiles = []
for p in sys.argv[5:]:
    im = Image.open(p).convert("RGB").crop((cx - half, cy - half, cx + half, cy + half))
    tiles.append(im.resize((im.width * 4, im.height * 4), Image.NEAREST))
sheet = Image.new("RGB", (sum(t.width for t in tiles) + 8 * (len(tiles) - 1), tiles[0].height), (255, 0, 255))
x = 0
for t in tiles:
    sheet.paste(t, (x, 0))
    x += t.width + 8
sheet.save(out)
print(f"{out}: {sheet.size} from centre ({cx},{cy}) half {half}, {len(tiles)} tiles at 4x")
