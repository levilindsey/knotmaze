# K1482 s13: per-site overlay of rem.json (remnant.ts) on a gf frame: plain crop | crop with chain centrelines,
# crossing points (white), window ends (green), joint room starts (cyan) and fused joints (magenta).
# python overlay13.py <out.png> <rem.json> <frame.png> <R> <Z> <sites comma list>
import sys, json
import numpy as np
from PIL import Image, ImageDraw
out, rj, fp, R, Z, names = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6].split(",")
Rm = json.load(open(rj)); F = np.asarray(Image.open(fp).convert("RGB")).astype(float)
W = 2 * R * Z
pal = [(255, 80, 80), (80, 200, 255), (255, 210, 60), (120, 255, 120), (255, 120, 255), (255, 160, 60), (160, 160, 255), (200, 255, 200)]
sheet = Image.new("RGB", (2 * (W + 6), len(names) * (W + 6)), "white")
for r, nm in enumerate(names):
    dx = dy = 0
    if "@" in nm:
        nm, off = nm.split("@"); dx, dy = (int(v) for v in off.split(","))
    B = Rm["boxes"][nm]; cx, cy = int(round(B["c"][0])) + dx, int(round(B["c"][1])) + dy
    im = F[cy - R:cy + R, cx - R:cx + R].copy()
    lo, hi = np.percentile(im, 1), np.percentile(im, 99.5); im = np.clip((im - lo) * 255 / max(hi - lo, 1), 0, 255)
    t0 = Image.fromarray(im.astype(np.uint8)).resize((W, W), Image.NEAREST)
    d0 = ImageDraw.Draw(t0); d0.text((3, 3), f"{nm} ({cx},{cy})", fill=(255, 255, 0))
    t = t0.copy(); d = ImageDraw.Draw(t)
    P = lambda p: ((p[0] - cx + R) * Z, (p[1] - cy + R) * Z)
    chs = sorted({L["ch"] for L in B["lines"]}); col = {c: pal[i % len(pal)] for i, c in enumerate(chs)}
    for L in B["lines"]:
        pts = [P(p) for p in L["pts"]]
        if len(pts) > 1: d.line(pts, fill=col[L["ch"]], width=1)
        m = L["pts"][len(L["pts"]) // 2]; d.text(P(m), str(L["ch"]), fill=col[L["ch"]])
    for sd in B["sides"]:
        c = P(sd["pC"]); w = P(sd["pW"])
        d.ellipse((c[0] - 4, c[1] - 4, c[0] + 4, c[1] + 4), outline=(255, 255, 255))
        d.text((c[0] + 5, c[1] - 12), f"x{sd['x']}", fill=(255, 255, 255))
        d.ellipse((w[0] - 3, w[1] - 3, w[0] + 3, w[1] + 3), fill=(0, 255, 0))
        d.text((w[0] + 4, w[1] + 2), f"{'+' if sd['dir'] > 0 else '-'}{(sd['rem'] if sd['rem'] is not None else 99):.2f}", fill=(0, 255, 0))
        if sd["pR"]:
            q = P(sd["pR"]); d.rectangle((q[0] - 2, q[1] - 2, q[0] + 2, q[1] + 2), fill=(0, 255, 255))
    for j in B["js"]:
        q = P(j["p"]); d.line((q[0] - 5, q[1] - 5, q[0] + 5, q[1] + 5), fill=(255, 0, 255), width=2); d.line((q[0] - 5, q[1] + 5, q[0] + 5, q[1] - 5), fill=(255, 0, 255), width=2)
    sheet.paste(t0, (0, r * (W + 6))); sheet.paste(t, (W + 6, r * (W + 6)))
sheet.save(out); print(out, sheet.size)
