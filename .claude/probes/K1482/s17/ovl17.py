# K1482 s17: frames side by side around points, plus one copy with every chain's centreline (gw_gf.json chainSamples,
# world -> device by sites_gf.json toDevA) drawn and labelled, and the sample index every 5 samples. Levels stretched.
#   python ovl17.py <out.png> <gw_gf.json> <sites_gf.json> <R> <Z> <x,y[,name];...> <label=frame.png> ...
import sys, json
import numpy as np
from PIL import Image, ImageDraw
out, gwp, sjp, R, Z, pts = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
frames = [(a.split("=", 1)[0], np.asarray(Image.open(a.split("=", 1)[1]).convert("RGB")).astype(float)) for a in sys.argv[7:]]
G = json.load(open(gwp)); S = json.load(open(sjp))
A = json.loads(S["toDevA"]) if isinstance(S["toDevA"], str) else S["toDevA"]
dev = lambda x, y: (A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5])
chains = []
for c, cs in enumerate(G["chainSamples"]):
    if not cs: chains.append(None); continue
    v = cs["positions"]["v"]; n = cs.get("count", len(v) // 2)
    chains.append([dev(v[2 * k], v[2 * k + 1]) for k in range(n)])
pal = [(255, 80, 80), (80, 200, 255), (255, 210, 60), (120, 255, 120), (255, 120, 255), (255, 160, 60), (160, 160, 255), (200, 255, 200)]
rows = []
for spec in pts.split(";"):
    p = spec.split(","); rows.append((int(p[0]), int(p[1]), p[2] if len(p) > 2 else f"{p[0]}:{p[1]}"))
W = (2 * R + 1) * Z
sheet = Image.new("RGB", ((len(frames) + 1) * (W + 6), len(rows) * (W + 6)), "white")
for r, (cx, cy, nm) in enumerate(rows):
    for c, (lbl, F) in enumerate(frames + [frames[-1]]):
        im = F[cy - R:cy + R + 1, cx - R:cx + R + 1].copy()
        im = np.clip((im - 14) * 6, 0, 255)
        t = Image.fromarray(im.astype(np.uint8)).resize((W, W), Image.NEAREST); d = ImageDraw.Draw(t)
        if c == len(frames):
            P = lambda q: ((q[0] - cx + R + 0.5) * Z, (q[1] - cy + R + 0.5) * Z)
            for ch, L in enumerate(chains):
                if not L: continue
                near = [i for i, q in enumerate(L) if abs(q[0] - cx) < R + 4 and abs(q[1] - cy) < R + 4]
                if not near: continue
                col = pal[ch % len(pal)]
                seg = [P(L[i]) for i in range(max(0, near[0] - 1), min(len(L), near[-1] + 2))]
                d.line(seg, fill=col, width=1)
                for i in near:
                    if i % 5 == 0: q = P(L[i]); d.ellipse((q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2), outline=col); d.text((q[0] + 3, q[1] - 10), f"{ch}:{i}", fill=col)
        d.text((3, 3), f"{nm} {lbl}", fill=(255, 255, 0))
        d.rectangle((R * Z, R * Z, R * Z + Z - 1, R * Z + Z - 1), outline=(255, 0, 0))
        sheet.paste(t, (c * (W + 6), r * (W + 6)))
sheet.save(out); print(out, sheet.size)
