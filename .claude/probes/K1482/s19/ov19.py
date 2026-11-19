# K1482 s19: chains' samples (cap15 DUMPGW gw_<name>.json) over a frame, around a device point, to read a site's topology.
#   python ov19.py <out.png> <gw.json> <sites_gf.json> <frame.png> <cx> <cy> <half> <chains c,c,...> [Z=4] [marks wx:wy,...]
# Each chain's samples in its own colour (every 5th sample numbered by index), the device transform from sites_gf.json
# (toDevA); marks are world points drawn as white crosses.
import sys, json
import numpy as np
from PIL import Image, ImageDraw
out, gwp, sjp, frame, cx, cy, H, chs = sys.argv[1:9]
cx, cy, H = int(cx), int(cy), int(H)
Z = int(sys.argv[9]) if len(sys.argv) > 9 else 4
marks = [tuple(map(float, m.split(":"))) for m in sys.argv[10].split(",")] if len(sys.argv) > 10 and sys.argv[10] else []
G = json.load(open(gwp)); A = json.load(open(sjp))["toDevA"]
F = np.asarray(Image.open(frame).convert("RGB")).astype(int)
crop = F[cy - H:cy + H, cx - H:cx + H]
im = Image.fromarray(np.clip((crop - 14) * 3, 0, 255).astype(np.uint8)).resize((2 * H * Z, 2 * H * Z), Image.NEAREST)
dr = ImageDraw.Draw(im)
dev = lambda x, y: ((A[0] * x + A[2] * y + A[4] - (cx - H)) * Z, (A[1] * x + A[3] * y + A[5] - (cy - H)) * Z)
cols = [(255, 60, 60), (60, 255, 60), (60, 200, 255), (255, 220, 0), (255, 0, 255), (255, 140, 0)]
for i, c in enumerate(map(int, chs.split(","))):
    P = G["chainSamples"][c]["positions"]["v"]
    pts = [dev(P[2 * k], P[2 * k + 1]) for k in range(len(P) // 2)]
    col = cols[i % len(cols)]
    for k in range(1, len(pts)):
        a, b = pts[k - 1], pts[k]
        if -50 < a[0] < 2 * H * Z + 50 and -50 < a[1] < 2 * H * Z + 50: dr.line((a, b), fill=col, width=1)
    for k, p in enumerate(pts):
        if 0 <= p[0] < 2 * H * Z and 0 <= p[1] < 2 * H * Z:
            dr.ellipse((p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2), outline=col)
            if k % 5 == 0: dr.text((p[0] + 3, p[1] + 2), f"{c}:{k}", fill=col)
for (wx, wy) in marks:
    x, y = dev(wx, wy); dr.line((x - 6, y, x + 6, y), fill=(255, 255, 255)); dr.line((x, y - 6, x, y + 6), fill=(255, 255, 255))
im.save(out); print(out, im.size)
