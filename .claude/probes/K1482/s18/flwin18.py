# K1482 s18: 220 px windows of the fl 1.2 frame at 2x, start-vs-tip changes (either fade) painted green.
#   python flwin18.py <raw dir> <out.png> <x:y,...>
import sys
import numpy as np
from PIL import Image, ImageDraw
R, out = sys.argv[1], sys.argv[2]
pts = [tuple(int(v) for v in p.split(":")) for p in sys.argv[3].split(",")]
I = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int)
a1, b1 = I(f"{R}/fls_start/gf_fls1.2.png"), I(f"{R}/fls_tip/gf_fls1.2.png")
a0, b0 = I(f"{R}/fls_start/gf_fls0.png"), I(f"{R}/fls_tip/gf_fls0.png")
ch = (np.abs(a0 - b0).sum(2) > 24) | (np.abs(a1 - b1).sum(2) > 24)
tiles = []
for x, y in pts:
    t = a1[y-110:y+110, x-110:x+110].astype(np.uint8).copy()
    m = ch[y-110:y+110, x-110:x+110]; t[m] = (0, 255, 0)
    im = Image.fromarray(t).resize((440, 440), Image.NEAREST)
    d = ImageDraw.Draw(im); d.text((4, 4), f"{x}:{y}", fill=(255, 255, 0)); d.rectangle([220 - 48, 220 - 48, 220 + 48, 220 + 48], outline=(255, 0, 0))
    tiles.append(im)
sh = Image.new("RGB", (440 * len(tiles), 440))
for i, t in enumerate(tiles): sh.paste(t, (i * 440, 0))
sh.save(out)
