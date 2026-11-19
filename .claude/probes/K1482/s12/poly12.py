# K1482 s12: the 4x tiles of sheet12.py with the renderer's chainSamples polylines drawn on top (1 px, one colour
# per chain, chain index printed where the polyline is nearest the box centre), from that capture's ps_<name>.json
# (DUMPPS=1) through its sites_<name>.json transform. Shows which threads the physics/samples put in the box.
#   python poly12.py <out.png> <sites,list> <label=frame.png=sites.json=ps.json> ... [env R=40 Z=4 RAW=0 (1: no lines)]
import json, os, sys, colorsys
import numpy as np
from PIL import Image, ImageDraw
out, sites = sys.argv[1], sys.argv[2].split(",")
R = int(os.environ.get("R", 40)); Z = int(os.environ.get("Z", 4)); W = 2 * R * Z
frames = []
for a in sys.argv[3:]:
    lbl, fp, sp, pp = a.split("=", 3)
    J = json.load(open(sp)); P = json.load(open(pp))
    frames.append((lbl, np.asarray(Image.open(fp).convert("RGB")).astype(float), {s["site"]: s for s in J["sites"]}, J["toDevA"], P))
H = 16
sheet = Image.new("RGB", (len(frames) * (W + 6), len(sites) * (W + H)), "white")
dd = ImageDraw.Draw(sheet)
def col(c):
    r, g, b = colorsys.hsv_to_rgb((c * 0.6180339) % 1, 1, 1); return (int(r * 255), int(g * 255), int(b * 255))
for r, site in enumerate(sites):
    for i, (lbl, im, S, A, P) in enumerate(frames):
        s = S[site]; cx, cy = round(s["x"]), round(s["y"])
        c = im[cy - R:cy + R, cx - R:cx + R]
        lo, hi = np.percentile(c, 1), np.percentile(c, 99.5)
        c = np.clip((c - lo) * 255 / max(hi - lo, 1), 0, 255)
        t = Image.fromarray(c.astype(np.uint8)).resize((W, W), Image.NEAREST); d = ImageDraw.Draw(t)
        names = []
        if os.environ.get("RAW") != "1":
            for ch, sm in enumerate(P["samples"]):
                if not sm: continue
                p = np.array(sm["positions"]).reshape(-1, 2)
                x = (A[0] * p[:, 0] + A[2] * p[:, 1] + A[4] - cx + R) * Z; y = (A[1] * p[:, 0] + A[3] * p[:, 1] + A[5] - cy + R) * Z
                inb = (x > -20) & (x < W + 20) & (y > -20) & (y < W + 20)
                if not inb.any(): continue
                pts = list(zip(x.tolist(), y.tolist()))
                for k in range(len(pts) - 1):
                    if inb[k] or inb[k + 1]: d.line((pts[k], pts[k + 1]), fill=col(ch), width=1)
                k = int(np.argmin((x - W / 2) ** 2 + (y - W / 2) ** 2))
                if 0 <= x[k] < W and 0 <= y[k] < W: d.text((x[k] + 3, y[k] + 3), str(ch), fill=col(ch)); names.append(ch)
        sheet.paste(t, (i * (W + 6), r * (W + H) + H))
        dd.text((i * (W + 6) + 2, r * (W + H) + 2), f"{site} {lbl} ({cx},{cy}) chains {sorted(names)}", fill=(200, 0, 0))
sheet.save(out); print(out, sheet.size)
