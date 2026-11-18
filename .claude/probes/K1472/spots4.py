#!/usr/bin/env python3
# K1472 s3: one 4x sheet per spot (rows f3 f5 f6 rest, columns today | master gf | my gf) and the
# difference counts (> 24) in each spot's 100 px box.  python spots4.py <dir> <outPrefix> [frames]
import sys
from PIL import Image, ImageDraw, ImageChops
d = sys.argv[1]; out = sys.argv[2]
spots = [("start marker", 59, 73), ("TL dashed strand", 158, 126), ("lone arc / front end", 305, 168), ("TR cluster", 735, 158),
         ("R edge loop", 819, 368), ("blue loop", 294, 546), ("centre", 462, 494), ("L middle", 126, 452), ("BL", 84, 746),
         ("bottom orange", 378, 767), ("BR", 693, 704), ("R flare", 756, 599), ("unrevealed top-mid", 525, 158)]
frames = (sys.argv[3] if len(sys.argv) > 3 else "f3,f5,f6,rest").split(",")
cols = ["today", "master", "mine"]; S = 100; Z = 4; T = S * Z
I = {(c, f): Image.open(f"{d}/levi_{c}_{f}.png").convert("RGB") for c in cols for f in frames}
n = lambda p, q: sum(1 for v in ImageChops.difference(p, q).convert("L").get_flattened_data() if v > 24)
for si, (name, x, y) in enumerate(spots):
    box = (x - S // 2, y - S // 2, x + S // 2, y + S // 2)
    r = Image.new("RGB", (3 * (T + 4), len(frames) * (T + 18)), (255, 255, 255)); dr = ImageDraw.Draw(r)
    line = [name]
    for j, f in enumerate(frames):
        a, b, m = [I[(c, f)].crop(box) for c in cols]
        for k, c in enumerate(cols):
            X = k * (T + 4); Y = j * (T + 18)
            r.paste([a, b, m][k].resize((T, T), Image.NEAREST), (X, Y + 18)); dr.text((X + 2, Y + 3), f"{name} {f} {c}", fill=(0, 0, 0))
        line.append(f"{f}: today~master {n(a, b)} today~mine {n(a, m)} master~mine {n(b, m)}")
    r.save(f"{out}_{si:02d}.png")
    print(" | ".join(line))
