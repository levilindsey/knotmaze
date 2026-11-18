# K1482: per site, the stroke's pieces (8-connected, L <= THR) in two frames of one state: a site whose count of
# pieces >= MINPX rises from A to B has a new break; one whose count of all pieces falls lost specks.
#   python pieces.py <sites.json> <A.png> <B.png> [R=28] [THR=21] [MINPX=6]
import json, sys
import numpy as np
from PIL import Image

sites, fa, fb = sys.argv[1:4]
R = int(sys.argv[4]) if len(sys.argv) > 4 else 28
THR = int(sys.argv[5]) if len(sys.argv) > 5 else 21
MINPX = int(sys.argv[6]) if len(sys.argv) > 6 else 6
A = np.asarray(Image.open(fa).convert("L")) <= THR
B = np.asarray(Image.open(fb).convert("L")) <= THR

def pieces(m):
    h, w = m.shape; seen = np.zeros_like(m); sizes = []
    for y0 in range(h):
        for x0 in range(w):
            if m[y0, x0] and not seen[y0, x0]:
                st = [(y0, x0)]; seen[y0, x0] = True; n = 0
                while st:
                    y, x = st.pop(); n += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = y + dy, x + dx
                            if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not seen[yy, xx]:
                                seen[yy, xx] = True; st.append((yy, xx))
                sizes.append(n)
    return sizes

up, gone = [], []
print("site\tA_all\tB_all\tA_big\tB_big")
for s in json.load(open(sites))["sites"]:
    x, y = round(s["x"]), round(s["y"])
    pa = pieces(A[y - R:y + R, x - R:x + R]); pb = pieces(B[y - R:y + R, x - R:x + R])
    ba = sum(1 for n in pa if n >= MINPX); bb = sum(1 for n in pb if n >= MINPX)
    print(f"{s['site']}\t{len(pa)}\t{len(pb)}\t{ba}\t{bb}")
    if bb > ba: up.append(f"{s['site']}({ba}->{bb})")
    if len(pb) < len(pa): gone.append(s["site"])
print(f"# new breaks (pieces >= {MINPX} px rose): {len(up)} {' '.join(up)}", file=sys.stderr)
print(f"# sites that lost pieces (specks gone): {len(gone)}", file=sys.stderr)
