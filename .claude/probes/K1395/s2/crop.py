# K1395 s2: side-by-side crops (today | gf ...) around one chain, or a given box, scaled up.
#   python crop.py <out.png> <scale> <ch|x,y,w,h> <img1> <img2> ... [--json <alpha json for the chain box>]
import sys, json
from PIL import Image, ImageDraw
args = sys.argv[1:]
js = None
if "--json" in args:
    i = args.index("--json"); js = args[i + 1]; del args[i:i + 2]
out, scale, box = args[0], int(args[1]), args[2]
ims = [Image.open(p).convert("RGB") for p in args[3:]]
if "," in box:
    x, y, w, h = map(int, box.split(","))
else:
    ch = int(box); d = json.load(open(js))
    rows = [r for c in d["chains"] if c and c["ch"] == ch for r in c["rows"]]
    xs = [r[0] for r in rows]; ys = [r[1] for r in rows]
    x, y = int(min(xs)) - 12, int(min(ys)) - 12; w, h = int(max(xs) - min(xs)) + 24, int(max(ys) - min(ys)) + 24
cr = [im.crop((x, y, x + w, y + h)).resize((w * scale, h * scale), Image.NEAREST) for im in ims]
S = Image.new("RGB", (len(cr) * (w * scale + 6), h * scale), (255, 0, 255))
for i, c in enumerate(cr): S.paste(c, (i * (w * scale + 6), 0))
S.save(out)
print("box", x, y, w, h, "->", S.size)
