# K1482 s13: tiles of named sites from one or more frames, side by side per site, rows = sites.
# python tiles13.py <out.png> <sites.json> <R> <Z> <sites comma list> <label=frame.png> ... [--grid 10] [--ink]
# --grid N draws a faint device-pixel grid every N px; --ink paints ink pixels (RGB sum <= 73) red on a copy.
# A site may be given as name@dx:dy to shift its centre.
import sys, json
import numpy as np
from PIL import Image, ImageDraw
out, sj, R, Z, names = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5].split(",")
rest = sys.argv[6:]; grid = 0; ink = False
if "--grid" in rest:
    i = rest.index("--grid"); grid = int(rest[i + 1]); rest = rest[:i] + rest[i + 2:]
if "--ink" in rest:
    rest.remove("--ink"); ink = True
S = {s["site"]: s for s in json.load(open(sj))["sites"]}
frames = []
for a in rest:
    lbl, fp = a.split("=", 1)
    frames.append((lbl, np.asarray(Image.open(fp).convert("RGB")).astype(float)))
W = 2 * R * Z
sheet = Image.new("RGB", (len(frames) * (W + 6) + 6, len(names) * (W + 6)), "white")
for r, nm in enumerate(names):
    dx = dy = 0
    if "@" in nm:
        nm, off = nm.split("@"); dx, dy = (int(v) for v in off.split(":"))
    cx, cy = int(round(S[nm]["x"])) + dx, int(round(S[nm]["y"])) + dy
    for c, (lbl, F) in enumerate(frames):
        im = F[cy - R:cy + R, cx - R:cx + R].copy()
        if ink:
            m = im.sum(axis=2) <= 73
        lo, hi = np.percentile(im, 1), np.percentile(im, 99.5); im = np.clip((im - lo) * 255 / max(hi - lo, 1), 0, 255)
        if ink:
            im[m] = (im[m] * 0.4 + np.array([255, 0, 0]) * 0.6)
        t = Image.fromarray(im.astype(np.uint8)).resize((W, W), Image.NEAREST); d = ImageDraw.Draw(t)
        if grid:
            for g in range(0, 2 * R + 1, grid):
                d.line((g * Z, 0, g * Z, W), fill=(90, 90, 140)); d.line((0, g * Z, W, g * Z), fill=(90, 90, 140))
        d.text((3, 3), f"{nm} {lbl} ({cx},{cy})", fill=(255, 255, 0))
        sheet.paste(t, (c * (W + 6), r * (W + 6)))
sheet.save(out); print(out, sheet.size)
