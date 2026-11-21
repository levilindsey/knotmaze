# K1482 s33: a whole-image diff of two captures of one state, by place (luminance step >= T, default 1), each place
# named by its nearest site, gain-only (new darker) / lose-only (new lighter) / mixed counted apart; the floor from a
# repeat load of today (a2); the N largest places on one sheet (context crop with a red box, then the box closer,
# today | new, both panels stretched by today's crop's 1..99 percentiles).
#   python diff33.py <a.png> <b.png> <sites.json> <out_prefix> [a2.png] [T=1] [N=10]
import sys, json, hashlib
import numpy as np
from PIL import Image, ImageDraw

a_p, b_p, s_p, out = sys.argv[1:5]
a2_p = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != "-" else None
T = int(sys.argv[6]) if len(sys.argv) > 6 else 1
N = int(sys.argv[7]) if len(sys.argv) > 7 else 10
load = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(np.int32)
lum = lambda X: (X[..., 0] * 299 + X[..., 1] * 587 + X[..., 2] * 114) // 1000
md5 = lambda p: hashlib.md5(open(p, "rb").read()).hexdigest()[:12]
pxh = lambda X: hashlib.md5(X.astype(np.uint8).tobytes()).hexdigest()[:12]
A, B = load(a_p), load(b_p)
S = json.load(open(s_p))["sites"]
SX = np.array([s["x"] for s in S]); SY = np.array([s["y"] for s in S]); SN = [s["site"] for s in S]


def site(x, y):
    d = np.hypot(SX - x, SY - y); i = int(np.argmin(d)); return SN[i], float(d[i])


def places(X, Y, tag):
    d = lum(Y) - lum(X); m = np.abs(d) >= T
    ys, xs = np.nonzero(m)
    cells = {}
    for y, x in zip(ys.tolist(), xs.tolist()): cells.setdefault((y // 24, x // 24), []).append((y, x, int(d[y, x])))
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
    gonly = sum(1 for g in groups if all(p[2] < 0 for p in g)); lonly = sum(1 for g in groups if all(p[2] > 0 for p in g))
    print(f"{tag}: {int(m.sum())} px changed at lum step >= {T} (new darker {int((d <= -T).sum())}, new lighter {int((d >= T).sum())}),"
          f" places {len(groups)}: gain-only {gonly}, lose-only {lonly}, mixed {len(groups) - gonly - lonly}")
    rows = []
    for g in groups:
        yy = [p[0] for p in g]; xx = [p[1] for p in g]; cx, cy = int(np.mean(xx)), int(np.mean(yy))
        gn = sum(1 for p in g if p[2] < 0); ls = len(g) - gn; nm, dd = site(cx, cy)
        kind = "gain-only" if ls == 0 else "lose-only" if gn == 0 else "mixed"
        rows.append(dict(x=cx, y=cy, n=len(g), gain=gn, lose=ls, kind=kind, maxstep=max(abs(p[2]) for p in g),
                         box=[min(xx), min(yy), max(xx), max(yy)], site=nm, sd=round(dd)))
        print(f"  {cx},{cy} near {nm} ({dd:.0f} px): n {len(g)} gain {gn} lose {ls} {kind} maxstep {rows[-1]['maxstep']} box {rows[-1]['box']}")
    return rows


print("hashes: a", md5(a_p), pxh(A), " b", md5(b_p), pxh(B))
if a2_p:
    A2 = load(a2_p); print("hashes: a2", md5(a2_p), pxh(A2), "(a == a2:", bool((A == A2).all()), ")")
    places(A, A2, "floor (today vs today again)")
R = places(A, B, "today vs new")
json.dump(R, open(out + "_places.json", "w"), indent=1)


def stretch(X, Y, x0, y0, x1, y1, z, box=None):
    ca = X[y0:y1, x0:x1].astype(np.float64); cb = Y[y0:y1, x0:x1].astype(np.float64)
    lo, hi = np.percentile(ca, 1), np.percentile(ca, 99)
    f = lambda c: Image.fromarray(np.clip((c - lo) / max(1.0, hi - lo) * 255, 0, 255).astype(np.uint8)).resize(((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST)
    ia, ib = f(ca), f(cb)
    if box:
        for im in (ia, ib):
            ImageDraw.Draw(im).rectangle([(box[0] - x0) * z, (box[1] - y0) * z, (box[2] - x0 + 1) * z, (box[3] - y0 + 1) * z], outline=(255, 0, 0), width=2)
    s = Image.new("RGB", (ia.width * 2 + 8, ia.height), (255, 0, 255)); s.paste(ia, (0, 0)); s.paste(ib, (ia.width + 8, 0)); return s


H, W = A.shape[:2]
tiles = []
for r in R[:N]:
    bx = r["box"]; pad = 6
    b0 = [max(0, bx[0] - pad), max(0, bx[1] - pad), min(W - 1, bx[2] + pad), min(H - 1, bx[3] + pad)]
    cx, cy = r["x"], r["y"]; C = 110
    ctx = stretch(A, B, max(0, cx - C), max(0, cy - C), min(W, cx + C), min(H, cy + C), 2, b0)
    side = max(b0[2] - b0[0], b0[3] - b0[1], 24); z = max(3, min(10, 300 // side))
    mx, my = (b0[0] + b0[2]) // 2, (b0[1] + b0[3]) // 2; hs = side // 2 + 2
    det = stretch(A, B, max(0, mx - hs), max(0, my - hs), min(W, mx + hs), min(H, my + hs), z)
    lab = f"{r['site']} {r['x']},{r['y']} n {r['n']} +{r['gain']} -{r['lose']} {r['kind']}"
    t = Image.new("RGB", (ctx.width + det.width + 16, max(ctx.height, det.height) + 18), (255, 255, 255))
    ImageDraw.Draw(t).text((4, 2), lab + "   (today | new, stretched)", fill=(0, 0, 0)); t.paste(ctx, (0, 18)); t.paste(det, (ctx.width + 16, 18))
    tiles.append(t)
if tiles:
    sw = max(t.width for t in tiles); sh = sum(t.height + 6 for t in tiles)
    sheet = Image.new("RGB", (sw, sh), (255, 255, 255)); y = 0
    for t in tiles: sheet.paste(t, (0, y)); y += t.height + 6
    sheet.save(out + "_top.png"); print("sheet", out + "_top.png")
