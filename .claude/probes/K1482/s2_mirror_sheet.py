# K1482 s2: real screens master | tip, plus the frozen-table mirror's ink diff (red = tip adds, green = tip removes),
# at the named sites (the mirror json's cx, cy, R). For scenes that move between captures (the bare ?3 design).
#   python s2_mirror_sheet.py <master.png> <tip.png> <mirror_master.json> <mirror_tip.json> <out_prefix> <site,site,...> [PER=12]
import sys, json
import numpy as np
from PIL import Image, ImageDraw
a, b, ma, mb, out, names = sys.argv[1:7]; PER = int(sys.argv[7]) if len(sys.argv) > 7 else 12
A = np.asarray(Image.open(a).convert("RGB")); B = np.asarray(Image.open(b).convert("RGB"))
MA = json.load(open(ma)); MB = json.load(open(mb)); names = names.split(",")
import os
def boost(X): return X.copy() if os.environ.get("BOOST") == "0" else np.clip((X.astype(np.int32) - 14) * 4, 0, 255).astype(np.uint8)
for page in range((len(names) + PER - 1) // PER):
    sp = names[page * PER:(page + 1) * PER]; cols = 2; rows = (len(sp) + 1) // 2
    R = MA[sp[0]]["R"]; T = 2 * R * 4
    im = Image.new("RGB", (cols * (3 * T + 20), rows * (T + 14) + 14), "white"); dr = ImageDraw.Draw(im)
    dr.text((2, 1), "screen master | screen tip | mirror ink diff (red = tip adds, green = tip removes)", fill="black")
    for q, nm in enumerate(sp):
        m = MA[nm]; R = m["R"]; cx, cy = m["cx"], m["cy"]
        P = np.array(m["px"], float).reshape(2 * R, 2 * R, 6); Q = np.array(MB[nm]["px"], float).reshape(2 * R, 2 * R, 6)
        ia, ib = P[..., 0] >= 0.5, Q[..., 0] >= 0.5
        d = np.full((2 * R, 2 * R, 3), 200, np.uint8); d[ia & ib] = (40, 40, 60); d[ia & ~ib] = (0, 220, 0); d[ib & ~ia] = (255, 0, 0)
        ox, oy = (q % cols) * (3 * T + 20), 14 + (q // cols) * (T + 14)
        dr.text((ox + 2, oy), nm, fill="red")
        for j, c in enumerate((boost(A[cy - R:cy + R, cx - R:cx + R]), boost(B[cy - R:cy + R, cx - R:cx + R]), d)):
            im.paste(Image.fromarray(c).resize((T, T), Image.NEAREST), (ox + j * (T + 3), oy + 12))
    im.save(f"{out}_{page:02d}.png"); print("wrote", f"{out}_{page:02d}.png")

