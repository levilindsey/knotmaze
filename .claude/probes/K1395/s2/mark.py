# K1395 s2: draw one chain's samples over both shots (green = CPU alpha >= 0.9, red = < 0.1, yellow between;
# every 16th sample labelled), crop around the chain, scale up.   python mark.py <out/tag> <ch> <out.png> [scale]
import sys, json
from PIL import Image, ImageDraw
tag, ch, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
sc = int(sys.argv[4]) if len(sys.argv) > 4 else 3
panels = []
for col in ("today", "gf"):
    im = Image.open(f"{tag}_{col}.png").convert("RGB"); d = json.load(open(f"{tag}_{col}.json"))
    rows = [c for c in d["chains"] if c and c["ch"] == ch][0]["rows"]
    xs = [r[0] for r in rows]; ys = [r[1] for r in rows]
    x0, y0 = int(min(xs)) - 15, int(min(ys)) - 15; x1, y1 = int(max(xs)) + 15, int(max(ys)) + 15
    big = im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.NEAREST)
    dr = ImageDraw.Draw(big)
    for k, r in enumerate(rows):
        a = r[2]; cl = (0, 200, 0) if a >= 0.9 else (230, 0, 0) if a < 0.1 else (230, 200, 0)
        X, Y = (r[0] - x0) * sc, (r[1] - y0) * sc
        dr.point((X, Y), fill=cl)
        if k % 16 == 0: dr.text((X + 3, Y - 10), str(k), fill=(0, 0, 160))
    panels.append(big)
W = sum(p.size[0] for p in panels) + 6; H = max(p.size[1] for p in panels)
S = Image.new("RGB", (W, H), (255, 0, 255)); x = 0
for p in panels: S.paste(p, (x, 0)); x += p.size[0] + 6
S.save(out); print(S.size)
