# K1482 s32: today | new crops at a site (context + detail, contrast stretched) and a whole-image diff by place.
#   python sheet32.py <a.png> <b.png> <out_prefix> <cx> <cy> [<a2.png>]
import sys
import numpy as np
from PIL import Image, ImageDraw
a_p, b_p, out, cx, cy = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
A = np.asarray(Image.open(a_p).convert("RGB")).astype(np.int32); B = np.asarray(Image.open(b_p).convert("RGB")).astype(np.int32)
lum = lambda X: (X[..., 0] * 299 + X[..., 1] * 587 + X[..., 2] * 114) // 1000
def crop(X, r, z):
    c = X[max(0, cy - r):cy + r, max(0, cx - r):cx + r].astype(np.float64)
    lo, hi = np.percentile(c, 1), np.percentile(c, 99); c = np.clip((c - lo) / max(1.0, hi - lo) * 255, 0, 255).astype(np.uint8)
    return Image.fromarray(c).resize((c.shape[1] * z, c.shape[0] * z), Image.NEAREST)
for name, r, z in (("ctx", 120, 3), ("det", 30, 10)):
    ia, ib = crop(A, r, z), crop(B, r, z); s = Image.new("RGB", (ia.width * 2 + 10, ia.height), (255, 0, 255)); s.paste(ia, (0, 0)); s.paste(ib, (ia.width + 10, 0)); s.save(f"{out}_{name}.png")
def places(X, Y, tag):
    d = lum(Y) - lum(X); m = np.abs(d) >= 1
    ys, xs = np.nonzero(m); print(f"{tag}: {m.sum()} px changed (lum step >= 1), gained(darker) {(d < 0).sum()}, lost(lighter) {(d > 0).sum()}")
    cells = {}
    for y, x in zip(ys, xs): cells.setdefault((y // 24, x // 24), []).append((y, x, d[y, x]))
    seen = set(); groups = []
    for k in cells:
        if k in seen: continue
        st = [k]; seen.add(k); g = []
        while st:
            c = st.pop(); g += cells[c]
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    n = (c[0] + dy, c[1] + dx)
                    if n in cells and n not in seen: seen.add(n); st.append(n)
        groups.append(g)
    groups.sort(key=lambda g: -len(g))
    for g in groups[:12]:
        yy = [p[0] for p in g]; xx = [p[1] for p in g]; gn = sum(1 for p in g if p[2] < 0); ls = len(g) - gn
        print(f"  {int(np.mean(xx))},{int(np.mean(yy))}: n {len(g)} darker {gn} lighter {ls} maxstep {max(abs(int(p[2])) for p in g)}")
    print(f"  places {len(groups)} (darker-only {sum(1 for g in groups if all(p[2] < 0 for p in g))}, lighter-only {sum(1 for g in groups if all(p[2] > 0 for p in g))})")
    return groups
if len(sys.argv) > 6:
    A2 = np.asarray(Image.open(sys.argv[6]).convert("RGB")).astype(np.int32); places(A, A2, "floor (today vs today)")
G = places(A, B, "today vs new")
im = Image.fromarray(B.astype(np.uint8)); dr = ImageDraw.Draw(im)
for g in G[:10]:
    yy = [p[0] for p in g]; xx = [p[1] for p in g]; dr.rectangle([min(xx) - 12, min(yy) - 12, max(xx) + 12, max(yy) + 12], outline=(255, 0, 0), width=3)
im.save(f"{out}_boxes.png")
