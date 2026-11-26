"""K1626: draw a census state (census.ts json): threads at their width, over/under
shown by drawing order at crossings (unders broken), junctions green, near
(junction, crossing) pairs labelled.

  python plot.py <state.json> <out.png> [scale=60] [x0,y0,x1,y1] [near_w=3]
"""
import json, sys, math
from PIL import Image, ImageDraw

S = json.load(open(sys.argv[1]))
out = sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 60
box = [float(v) for v in sys.argv[4].split(",")] if len(sys.argv) > 4 and sys.argv[4] != "-" else None
near_w = float(sys.argv[5]) if len(sys.argv) > 5 else 3
pos = S["positions"]; tw = S["tw"]
P = lambda i: (pos[2 * i], pos[2 * i + 1])
xs_all = pos[0::2]; ys_all = pos[1::2]
if box is None:
    box = [min(xs_all) - 1, min(ys_all) - 1, max(xs_all) + 1, max(ys_all) + 1]
x0, y0, x1, y1 = box
W, H = int((x1 - x0) * scale), int((y1 - y0) * scale)
img = Image.new("RGB", (W, H), (238, 232, 224))
d = ImageDraw.Draw(img)
T = lambda p: ((p[0] - x0) * scale, (p[1] - y0) * scale)
cols = [(200, 120, 200), (210, 130, 120), (160, 120, 210), (120, 160, 200), (200, 150, 90), (120, 180, 130)]
for c, ch in enumerate(S["chains"]):
    brk = S["brk"][c]
    n = len(ch)
    segs = range(n) if brk < 0 else [k for k in range(n) if k != brk]
    for k in segs:
        a, b = T(P(ch[k])), T(P(ch[(k + 1) % n]))
        d.line([a, b], fill=cols[c % len(cols)], width=max(1, int(tw * scale)))
# centre lines thin dark
for c, ch in enumerate(S["chains"]):
    brk = S["brk"][c]; n = len(ch)
    segs = range(n) if brk < 0 else [k for k in range(n) if k != brk]
    for k in segs:
        d.line([T(P(ch[k])), T(P(ch[(k + 1) % n]))], fill=(60, 60, 60), width=1)
for X in S["xs"]:
    p = T((X["x"], X["y"])); r = 4
    d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], outline=(220, 0, 0), width=2)
for J in S["juncs"]:
    p = T((J["x"], J["y"])); r = 5
    d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=(0, 150, 0))
for N in S["near"]:
    if N["dw"] >= near_w: continue
    a = T((N["jx"], N["jy"])); b = T((N["xx"], N["xy"]))
    d.line([a, b], fill=(0, 0, 255), width=2)
    d.text(((a[0] + b[0]) / 2 + 3, (a[1] + b[1]) / 2), f"{N['dw']:.2f}", fill=(0, 0, 160))
img.save(out)
print(W, H)
