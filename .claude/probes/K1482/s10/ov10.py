# K1482 s10: per site, 4x tiles of today (bg=none&cs=mono), gf, and the overlay (grey = gf ink only, magenta = today
# outline only, green = both) with the centrelines, crossings (x<i> o<over> u<under>, window ends as ticks) and
# fused joints (orange J<chain>) from gwprobe.ts's OVERLAY json. Prints each site's magenta pixels as runs.
#   python ov10.py <today_tbn.png> <gf.png> <ov.json> <sites,...> <out.png> [R=36 Z=4] [MAG=<out.json>]
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
tp, gp, ovp, names, out = sys.argv[1:6]
R = int(os.environ.get("R", 36)); Z = int(os.environ.get("Z", 4))
Traw = np.asarray(Image.open(tp).convert("RGB")).astype(int)
Graw = np.asarray(Image.open(gp).convert("RGB")).astype(int)
G = Graw.sum(-1) <= 73
TI = (Traw.sum(-1) <= 73) if os.environ.get("TINK") else (np.abs(Traw - np.array([21, 27, 40])).sum(-1) > 12)
ov = json.load(open(ovp))
cols = [(255, 80, 80), (80, 200, 255), (255, 200, 0), (0, 220, 160), (200, 120, 255), (255, 140, 0), (160, 255, 120)]
rows = []; mag = {}
def boost(a):
    a = a.astype(float); lo, hi = np.percentile(a, 1), np.percentile(a, 99.5)
    return np.clip((a - lo) * 255 / max(hi - lo, 1), 0, 255).astype(np.uint8)
for nm in names.split(","):
    o = ov[nm]; cx, cy = o["c"]
    sl = (slice(cy - R, cy + R), slice(cx - R, cx + R))
    g, t = G[sl], TI[sl]
    im = np.full(g.shape + (3,), 255, np.uint8); im[g] = (150, 150, 150); im[t & ~g] = (230, 0, 200); im[t & g] = (0, 170, 0)
    m = t & ~g
    # magenta pixels whose 3x3 has no gf ink (the brief's today outline with no gf ink near)
    gp_ = np.pad(g, 1); gd = np.zeros_like(g)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): gd |= gp_[1 + dy:1 + dy + g.shape[0], 1 + dx:1 + dx + g.shape[1]]
    mm = m & ~gd
    seen = np.zeros_like(mm); runs = []
    for y0, x0 in zip(*np.nonzero(mm)):
        if seen[y0, x0]: continue
        st = [(y0, x0)]; seen[y0, x0] = True; comp = []
        while st:
            y, x = st.pop(); comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < mm.shape[0] and 0 <= xx < mm.shape[1] and mm[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
        if len(comp) < 3: continue
        runs.append({"n": len(comp), "px": [[int(x + cx - R), int(y + cy - R)] for y, x in comp]})
    runs.sort(key=lambda r: -r["n"]); mag[nm] = runs
    print(nm, "magenta(no gf within 1px):", int(mm.sum()), "runs", [r["n"] for r in runs][:6])
    tiles = []
    T = lambda x, y: ((x - cx + R) * Z + Z // 2, (y - cy + R) * Z + Z // 2)
    for lbl, arr in (("today", boost(Traw[sl])), ("gf", boost(Graw[sl])), ("ov", im)):
        ti = Image.fromarray(arr).resize((2 * R * Z, 2 * R * Z), Image.NEAREST); d = ImageDraw.Draw(ti)
        if lbl == "ov":
            chs = sorted({l["ch"] for l in o["lines"]}); cc = {ch: cols[i % len(cols)] for i, ch in enumerate(chs)}
            for l in o["lines"]:
                pts = [T(p[0], p[1]) for p in l["pts"]]
                if len(pts) > 1: d.line(pts, fill=cc[l["ch"]], width=1)
                mpt = pts[len(pts) // 2]; d.text(mpt, "%d" % l["ch"], fill=cc[l["ch"]])
                for p in l["pts"][::8]: q = T(p[0], p[1]); d.text((q[0] + 3, q[1] + 3), "%.1f" % p[2], fill=(90, 90, 90))
            for x in o["xs"]:
                q = T(*x["p"]); d.ellipse((q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4), outline=(0, 0, 0)); d.text((q[0] + 5, q[1] - 12), "x%d o%d u%d" % (x["i"], x["o"], x["u"]), fill=(0, 0, 0))
                for e in (x["a"], x["b"]): q = T(*e); d.rectangle((q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2), fill=(0, 0, 0))
            for j in o["js"]:
                q = T(*j["p"]); d.rectangle((q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4), outline=(255, 128, 0)); d.text((q[0] + 5, q[1] + 2), "J%d" % j["ch"], fill=(255, 128, 0))
            for r in runs[:4]:
                p = r["px"][len(r["px"]) // 2]; q = T(*p); d.ellipse((q[0] - 3, q[1] - 3, q[0] + 3, q[1] + 3), outline=(0, 0, 255))
        d.text((2, 2), "%s %s" % (nm, lbl), fill=(255, 255, 0) if lbl != "ov" else (0, 0, 0)); tiles.append(ti)
    row = Image.new("RGB", (len(tiles) * (2 * R * Z + 6), 2 * R * Z), "white")
    for i, ti in enumerate(tiles): row.paste(ti, (i * (2 * R * Z + 6), 0))
    rows.append(row)
sheet = Image.new("RGB", (rows[0].width, sum(r.height + 6 for r in rows)), "white")
y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height + 6
sheet.save(out); print(len(rows), "rows ->", out)
if os.environ.get("MAG"): json.dump(mag, open(os.environ["MAG"], "w"))
