# K1482 s12 step 2: stage 9's overlay re-made against a pixel-aligned reference, one physics state (fff8c9e5).
# Today's outline = the cs=mono&bg=none frame's outline colour (backdrop (21,27,40), outline (42,29,40): R >= 32),
# which draws the same geometry as today as Levi sees it (tupd.mjs: a and b differ only in colour). Split by layer:
# FAN = pixels that change when root child 1 (the filletLayer, rebuildFillets' TriFanMesh) is hidden in today's
# default frame (|u0 - hide_1| > DT), BASE = the rest. gf's outline = gc_b's dark border (B <= 35; backdrop B 42-48).
# Classes: green both (today and gf), magenta today base only, orange today fan only, grey gf only.
#   python ov12.py <out.png> <sites,list> <mono.png> <u0.png> <hide1.png> <gf.png> <sites.json> [env R=40 Z=4 DT=6 COLS=4]
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
out, sites, fm, fu0, fh1, fgf, fs = sys.argv[1:8]; sites = sites.split(",")
R = int(os.environ.get("R", 40)); Z = int(os.environ.get("Z", 4)); DT = int(os.environ.get("DT", 6)); COLS = int(os.environ.get("COLS", 4))
L = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int)
mono, u0, h1, gf = L(fm), L(fu0), L(fh1), L(fgf)
today = mono[:, :, 0] >= 32
fan = np.abs(u0 - h1).max(2) > DT
gfm = gf[:, :, 2] <= 35
# FAR=k: colour only what one renderer draws with NO outline of the other within k dev px (a stroke the other lacks,
# not a shift or width difference): orange today fan, magenta today base, blue gf; light green today near gf, light
# grey gf near today; a ring of radius RING dev px around the site (the site_counts.json window).
FAR = int(os.environ.get("FAR", 0)); RING = int(os.environ.get("RING", 30))
def dil(m, k):
    r = m.copy()
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1):
            if dx * dx + dy * dy <= k * k: r |= np.roll(np.roll(m, dy, 0), dx, 1)
    return r
if FAR:
    gfd, tdd = dil(gfm, FAR), dil(today, FAR)
S ={s["site"]: s for s in json.load(open(fs))["sites"]}
W = 2 * R * Z; H = 16
rows = (len(sites) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * (W + 6), rows * (W + H)), "white"); dd = ImageDraw.Draw(sheet)
stats = {}
for k, site in enumerate(sites):
    s = S[site]; cx, cy = round(s["x"]), round(s["y"]); sl = (slice(cy - R, cy + R), slice(cx - R, cx + R))
    t, f, g = today[sl], fan[sl], gfm[sl]
    img = np.full((2 * R, 2 * R, 3), 255, np.uint8)
    tf = t & f; tb = t & ~f
    img[g & ~t] = (150, 150, 150)
    img[tb & ~g] = (220, 0, 200)
    img[tf & ~g] = (255, 140, 0)
    img[t & g] = (0, 170, 0)
    if FAR:
        gd, td = gfd[sl], tdd[sl]
        img[:] = 255
        img[g] = (205, 205, 205); img[t] = (150, 215, 150)
        img[g & ~td] = (0, 60, 255); img[tb & ~gd] = (220, 0, 200); img[tf & ~gd] = (255, 140, 0)
    stats[site] = {"todayBaseOnly": int((tb & ~g).sum()), "todayFanOnly": int((tf & ~g).sum()), "gfOnly": int((g & ~t).sum()), "both": int((t & g).sum()),
                   "fanPx": int(tf.sum()), "basePx": int(tb.sum()), "gfPx": int(g.sum())}
    tile = Image.fromarray(img).resize((W, W), Image.NEAREST); d = ImageDraw.Draw(tile)
    q = ((s["x"] - cx + R) * Z, (s["y"] - cy + R) * Z)
    d.line((q[0] - 7, q[1], q[0] + 7, q[1]), fill=(0, 0, 255), width=2); d.line((q[0], q[1] - 7, q[0], q[1] + 7), fill=(0, 0, 255), width=2)
    if FAR: d.ellipse((q[0] - RING * Z, q[1] - RING * Z, q[0] + RING * Z, q[1] + RING * Z), outline=(0, 0, 0), width=1)
    x0, y0 = (k % COLS) * (W + 6), (k // COLS) * (W + H)
    sheet.paste(tile, (x0, y0 + H))
    st = stats[site]
    dd.text((x0 + 2, y0 + 2), f"{site} ({cx},{cy}) base-only {st['todayBaseOnly']} fan-only {st['todayFanOnly']} gf-only {st['gfOnly']} both {st['both']}", fill=(200, 0, 0))
sheet.save(out); print(out, sheet.size); print(json.dumps(stats))
