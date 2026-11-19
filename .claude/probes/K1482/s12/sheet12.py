# K1482 s12: per site, Z-x tiles of several frames of one physics state around the site's device point, each tile
# contrast-stretched (1st..99.5th percentile, as s10 crop4.py), with every crossing of the scene that falls inside the
# box drawn as a hollow red ring at ITS OWN capture's printed position (sites_<name>.json "xings": physics particles
# through that page's root transform) and the site point as a yellow +. One row per site.
#   python sheet12.py <out.png> <sites,comma,list> <label=frame.png=sites.json> ... [env R=40 Z=4]
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
out, sites = sys.argv[1], sys.argv[2].split(",")
R = int(os.environ.get("R", 40)); Z = int(os.environ.get("Z", 4)); W = 2 * R * Z
frames = []
for a in sys.argv[3:]:
    lbl, fp, sp = a.split("=", 2)
    J = json.load(open(sp))
    frames.append((lbl, np.asarray(Image.open(fp).convert("RGB")).astype(float), {s["site"]: s for s in J["sites"]}, J["xings"]))
H = 16
sheet = Image.new("RGB", (len(frames) * (W + 6), len(sites) * (W + H)), "white")
dd = ImageDraw.Draw(sheet)
for r, site in enumerate(sites):
    for i, (lbl, im, S, X) in enumerate(frames):
        s = S[site]; cx, cy = round(s["x"]), round(s["y"])
        c = im[cy - R:cy + R, cx - R:cx + R]
        lo, hi = np.percentile(c, 1), np.percentile(c, 99.5)
        c = np.clip((c - lo) * 255 / max(hi - lo, 1), 0, 255)
        t = Image.fromarray(c.astype(np.uint8)).resize((W, W), Image.NEAREST); d = ImageDraw.Draw(t)
        for x in X:
            px, py = (x["x"] - cx + R) * Z, (x["y"] - cy + R) * Z
            if 0 <= px < W and 0 <= py < W: d.ellipse((px - 6, py - 6, px + 6, py + 6), outline=(255, 0, 0), width=2)
        q = ((s["x"] - cx + R) * Z, (s["y"] - cy + R) * Z)
        d.line((q[0] - 7, q[1], q[0] + 7, q[1]), fill=(255, 255, 0), width=2); d.line((q[0], q[1] - 7, q[0], q[1] + 7), fill=(255, 255, 0), width=2)
        sheet.paste(t, (i * (W + 6), r * (W + H) + H))
        dd.text((i * (W + 6) + 2, r * (W + H) + 2), f"{site}  {lbl}  ({cx},{cy}) dev px, box {2 * R}", fill=(200, 0, 0))
sheet.save(out); print(out, sheet.size)
