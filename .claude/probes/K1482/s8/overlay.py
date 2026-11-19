# K1482 s8: a site's centrelines, crossings (x<i> o<over> at the under point, window ends as ticks) and fused joints
# drawn over 4x crops of the frames.   python overlay.py <overlay.json> <out.png> <label=frame.png> ... [env R=40 Z=4]
import json, os, sys
from PIL import Image, ImageDraw
ov = json.load(open(sys.argv[1])); out = sys.argv[2]; frames = [a.split("=", 1) for a in sys.argv[3:]]
R = int(os.environ.get("R", 40)); Z = int(os.environ.get("Z", 4))
ims = [(l, Image.open(p).convert("RGB")) for l, p in frames]
cols = [(255, 80, 80), (80, 255, 80), (255, 255, 0), (0, 255, 255), (255, 0, 255), (255, 160, 0), (160, 160, 255)]
rows = []
for nm, o in ov.items():
    cx, cy = o["c"]; tiles = []
    chs = sorted({l["ch"] for l in o["lines"]}); cc = {ch: cols[i % len(cols)] for i, ch in enumerate(chs)}
    T = lambda x, y: ((x - cx + R) * Z, (y - cy + R) * Z)
    for lab, im in ims:
        t = im.crop((cx - R, cy - R, cx + R, cy + R)).resize((2 * R * Z, 2 * R * Z), Image.NEAREST)
        import numpy as np
        a = np.asarray(t).astype(int); s = a.sum(-1); g = np.clip((s - 40) * 255 / 400, 0, 255)  # ink black, fill light
        g = np.where(s <= 73, 0, 120 + g * 0.5); t = Image.fromarray(np.stack([g, g, g], -1).astype(np.uint8))
        d = ImageDraw.Draw(t)
        for l in o["lines"]:
            pts = [T(p[0], p[1]) for p in l["pts"]]
            if len(pts) > 1: d.line(pts, fill=cc[l["ch"]], width=1)
            m = pts[len(pts) // 2]; d.text(m, "%d" % l["ch"], fill=cc[l["ch"]])
            for p in l["pts"][::6]: q = T(p[0], p[1]); d.text((q[0] + 3, q[1] + 3), "%.1f" % p[2], fill=(200, 200, 200))
        for x in o["xs"]:
            q = T(*x["p"]); d.ellipse((q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4), outline=(255, 255, 255)); d.text((q[0] + 5, q[1] - 12), "x%d o%d u%d" % (x["i"], x["o"], x["u"]), fill=(255, 255, 255))
            for e in (x["a"], x["b"]): q = T(*e); d.rectangle((q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2), fill=(255, 255, 255))
        for j in o["js"]:
            q = T(*j["p"]); d.rectangle((q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4), outline=(255, 128, 0)); d.text((q[0] + 5, q[1] + 2), "J%d" % j["ch"], fill=(255, 128, 0))
        d.text((2, 2), "%s %s" % (nm, lab), fill=(255, 255, 255)); tiles.append(t)
    row = Image.new("RGB", (len(tiles) * (2 * R * Z + 6), 2 * R * Z), "white")
    for i, t in enumerate(tiles): row.paste(t, (i * (2 * R * Z + 6), 0))
    rows.append(row)
sheet = Image.new("RGB", (rows[0].width, sum(r.height + 6 for r in rows)), "white")
y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height + 6
sheet.save(out); print(len(rows), "rows ->", out)
