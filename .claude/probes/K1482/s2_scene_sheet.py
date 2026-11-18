# K1482 s2: master | tip | diff tiles at every changed spot of two gf frames (no site list needed).
#   python s2_scene_sheet.py <master.png> <tip.png> <outprefix> [R=28] [PER=18]
import sys
import numpy as np
from PIL import Image, ImageDraw
a, b, out = sys.argv[1:4]
R = int(sys.argv[4]) if len(sys.argv) > 4 else 28
PER = int(sys.argv[5]) if len(sys.argv) > 5 else 18
A = np.asarray(Image.open(a).convert("RGB")); B = np.asarray(Image.open(b).convert("RGB"))
L = lambda X: (X[..., :3].astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32))
dL = L(B) - L(A); ch = np.abs(dL) > 3
print("changed px", int(ch.sum()))
# cluster changed pixels: 16 px cells, 8-connected cells form one spot (no scipy here)
C = 16; ys, xs = np.nonzero(ch); cells = {}
for y, x in zip(ys // C, xs // C): cells[(int(y), int(x))] = cells.get((int(y), int(x)), 0) + 1
seen = set(); spots = []
for c0 in cells:
    if c0 in seen: continue
    st = [c0]; seen.add(c0); grp = []
    while st:
        c = st.pop(); grp.append(c)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nb = (c[0] + dy, c[1] + dx)
                if nb in cells and nb not in seen: seen.add(nb); st.append(nb)
    k = sum(cells[c] for c in grp)
    if k < 8: continue
    m = np.zeros_like(ch); 
    for (cy, cx) in grp: m[cy * C:(cy + 1) * C, cx * C:(cx + 1) * C] = ch[cy * C:(cy + 1) * C, cx * C:(cx + 1) * C]
    yy, xx = np.nonzero(m); spots.append((k, int(xx.mean()), int(yy.mean())))
spots.sort(reverse=True)
print("spots", len(spots), [s[0] for s in spots])
def boost(X): return np.clip((X.astype(np.int32) - 14) * 4, 0, 255).astype(np.uint8)
T = 2 * R * 4
for page in range((len(spots) + PER - 1) // PER):
    sp = spots[page * PER:(page + 1) * PER]; cols = 2; rows = (len(sp) + 1) // 2
    im = Image.new("RGB", (cols * (3 * T + 20) , rows * (T + 14) + 14), "white"); dr = ImageDraw.Draw(im)
    dr.text((2, 1), "master | tip | diff (red = tip darker, green = tip lighter)", fill="black")
    for q, (k, x, y) in enumerate(sp):
        cx, cy = (q % cols) * (3 * T + 20), 14 + (q // cols) * (T + 14)
        dr.text((cx + 2, cy), f"({x},{y}) {k}px", fill="red")
        x0, y0 = max(0, x - R), max(0, y - R)
        ca = A[y0:y0 + 2 * R, x0:x0 + 2 * R]; cb = B[y0:y0 + 2 * R, x0:x0 + 2 * R]
        cd = boost(cb).copy(); dd = dL[y0:y0 + 2 * R, x0:x0 + 2 * R]
        cd[dd < -3] = (255, 0, 0); cd[dd > 3] = (0, 255, 0)
        for j, c in enumerate((boost(ca), boost(cb), cd)):
            im.paste(Image.fromarray(c[..., :3]).resize((T, T), Image.NEAREST), (cx + j * (T + 3), cy + 12))
    im.save(f"{out}_{page:02d}.png"); print("wrote", f"{out}_{page:02d}.png")

