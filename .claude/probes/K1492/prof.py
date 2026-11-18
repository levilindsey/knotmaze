# K1492: ramp lengths of the under thread's end at crossings, border look's outline ink vs fill look's coverage.
#   python prof.py <dir> [fls=0/0.14/0.5/1.2] [prefix_border=b] [prefix_fill=f] [--sites ci:side,...] [--json out.json]
# <dir> holds shots.mjs's b_fl<v>.png, f_fl<v>.png and geo.json (one physics hash).
# Along the under centreline (arc da from the crossing, device px = da * pxPerWorld):
#   border: outline darkness on each outline (normal side +-1): the darkest pixel over lateral offsets
#     [h - 6 px, h + 3 px] (the outline ring), (Lbg - L) / (Lbg - Lfar), Lbg the thread's interior (centreline,
#     the background in the border look), Lfar the outline's level at the far end;
#   fill: centreline luminance (L - Lbg_out) / (Lfar - Lbg_out), Lbg_out the frame's background.
#   A pixel within (over half width + 3 px) of the over centreline counts as unknown (the over thread or its outline).
# Ramp = arc length (device px) from the first sample with level >= 0.1 to the first with level >= 0.9, scanning
# outward from the crossing (a 3-sample running median first). fl 0 must be a step (ramp <= 3 px).
import json, sys, math
import numpy as np
from PIL import Image

args = [a for a in sys.argv[1:]]
pos = args[: next((i for i, a in enumerate(args) if a.startswith("--")), len(args))]
d = pos[0]
fls = (pos[1] if len(pos) > 1 else "0/0.14/0.5/1.2").split("/")
pb = pos[2] if len(pos) > 2 else "b"
pf = pos[3] if len(pos) > 3 else "f"
sites = None; jout = None
if "--sites" in args: sites = [tuple(map(int, s.split(":"))) for s in args[args.index("--sites") + 1].split(",")]
if "--json" in args: jout = args[args.index("--json") + 1]
g = json.load(open(f"{d}/geo.json"))
ppw = g["pxPerWorld"]; hpx = g["h"] * ppw; EXCL = float(__import__("os").environ.get("EXCL", "1.5"))

def lum(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    return a @ np.array([0.299, 0.587, 0.114], np.float32)

def px(L, x, y):
    xi, yi = int(round(x)), int(round(y))
    if 0 <= yi < L.shape[0] and 0 <= xi < L.shape[1]: return float(L[yi, xi])
    return float("nan")

def med3(v):
    out = list(v)
    for i in range(1, len(v) - 1):
        w = [a for a in v[i - 1:i + 2] if a == a]
        out[i] = sorted(w)[len(w) // 2] if w else float("nan")
    return out

def ramp(da, lv):
    lv = med3(lv); i10 = i90 = None
    for i, v in enumerate(lv):
        if v != v: continue
        if i10 is None and v >= 0.1: i10 = i
        if v >= 0.9: i90 = i; break
    if i10 is None or i90 is None: return None, None
    return (da[i90] - da[i10]) * ppw, da[i10] * ppw

def side_geom(s):
    P = np.array([[p[1], p[2]] for p in s["prof"]]); da = [p[0] for p in s["prof"]]
    T = np.gradient(P, axis=0); T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-9)
    N = np.stack([-T[:, 1], T[:, 0]], 1)
    O = np.array(s["over"])
    dov = np.array([np.min(np.hypot(O[:, 0] - p[0], O[:, 1] - p[1])) for p in P])
    To = O[len(O) // 2 + 1] - O[len(O) // 2 - 1]; To /= np.linalg.norm(To)
    sin = abs(T[0, 0] * To[1] - T[0, 1] * To[0])
    return P, da, N, O, sin

def ring_dist(O, x, y): return float(np.min(np.hypot(O[:, 0] - x, O[:, 1] - y)))

def border_raw(L, geo):
    P, da, N, O, _ = geo
    out = {}
    for n in (1, -1):
        raw = []
        for i, p in enumerate(P):
            best = float("nan"); ok = np.linalg.norm(N[i]) > 0.5
            for off in np.arange(hpx - 6, hpx + 3.01, 1.0):
                if not ok: break
                x, y = p + N[i] * off * n
                if ring_dist(O, x, y) < hpx + EXCL: ok = False; break
                v = px(L, x, y)
                best = v if best != best else min(best, v)
            raw.append(best if ok else float("nan"))
        out[n] = raw
    return out

def fill_raw(L, geo):
    P, da, N, O, _ = geo
    return [px(L, *p) if ring_dist(O, *p) >= hpx + EXCL and np.linalg.norm(N[i]) > 0.5 else float("nan") for i, p in enumerate(P)]

def ref_range(raw):
    # the reference stretch: valid samples from 6 px past the first valid one to 70% of the side
    i0 = next((i for i, v in enumerate(raw) if v == v), None)
    if i0 is None: return []
    return [v for i, v in enumerate(raw[i0 + 14: int(len(raw) * 0.7)]) if v == v]

Ls = {}
for v in fls:
    Ls[("b", v)] = lum(f"{d}/{pb}_fl{v}.png")
    try: Ls[("f", v)] = lum(f"{d}/{pf}_fl{v}.png")
    except FileNotFoundError: pass
hist = np.histogram(Ls[("b", fls[0])], bins=256, range=(0, 256))[0]; bgL = float(np.argmax(hist)) + 0.5

cand = [s for s in g["sides"] if (sites is None and not s["self"] and s["lim"] >= 2.0) or (sites is not None and (s["ci"], s["side"]) in sites)]
res = []
for s in cand:
    geo = side_geom(s)
    da = geo[1]
    row = {"ci": s["ci"], "side": s["side"], "sin": round(geo[4], 2), "lim": s["lim"], "b": {}, "f": {}, "bl": {}, "fl": {}}
    P = geo[0]
    b0 = border_raw(Ls[("b", fls[0])], geo)
    cl = [px(Ls[("b", fls[0])], *p) for p in P]
    bgc = np.nanmedian(ref_range(cl)) if ref_range(cl) else float("nan")
    farb = {n: np.nanmedian(ref_range(b0[n])) if ref_range(b0[n]) else float("nan") for n in (1, -1)}
    f0 = fill_raw(Ls[("f", fls[0])], geo) if ("f", fls[0]) in Ls else None
    farf = np.nanmedian(ref_range(f0)) if f0 and ref_range(f0) else float("nan")
    row["contrast"] = {n: float(bgc - farb[n]) for n in (1, -1)}
    for v in fls:
        braw = b0 if v == fls[0] else border_raw(Ls[("b", v)], geo)
        bl = {n: [(bgc - x) / max(bgc - farb[n], 1e-3) if x == x else float("nan") for x in braw[n]] for n in (1, -1)}
        row["b"][v] = {n: ramp(da, bl[n]) if bgc - farb[n] >= 5 else (None, None) for n in (1, -1)}
        row["bl"][v] = bl
        if ("f", v) in Ls:
            fr = f0 if v == fls[0] else fill_raw(Ls[("f", v)], geo)
            fl = [(x - bgL) / max(farf - bgL, 1e-3) if x == x else float("nan") for x in fr]
            row["f"][v] = ramp(da, fl); row["fl"][v] = fl
    res.append(row)

def clean(r):
    # usable: every ramp found, fl 0 a step in both looks
    for v in fls:
        if r["f"] and r["f"][v][0] is None: return False
        for n in (1, -1):
            if r["b"][v][n][0] is None: return False
    z = fls[0]
    return all(r["b"][z][n][0] <= 3.5 for n in (1, -1)) and (not r["f"] or r["f"][z][0] <= 3.5)

good = [r for r in res if clean(r)]
print(f"hash {g['hash']} pxPerWorld {ppw:.2f} h {hpx:.1f}px  sides {len(res)} clean {len(good)}  bg {bgL}")
fmt = lambda x: "  -  " if x is None else f"{x:5.1f}"
print("site       sin  | " + " | ".join(f"fl {v}: fill  out+  out-" for v in fls))
for r in (good if sites is None else res)[: (12 if sites is None else 99)]:
    print(f"x{r['ci']:<4}{'+' if r['side'] > 0 else '-'}  {r['sin']:.2f} | " + " | ".join(
        f"{fmt(r['f'][v][0] if r['f'] else None)} {fmt(r['b'][v][1][0])} {fmt(r['b'][v][-1][0])}" for v in fls))
print("median over clean sides:")
for v in fls:
    fr = [r["f"][v][0] for r in good if r["f"]]; br = [r["b"][v][n][0] for r in good for n in (1, -1)]
    bs = [r["b"][v][n][1] for r in good for n in (1, -1)]; fs = [r["f"][v][1] for r in good if r["f"]]
    print(f"  fl {v}: fill ramp {np.median(fr) if fr else float('nan'):.1f} px (start {np.median(fs) if fs else float('nan'):.1f})  outline ramp {np.median(br):.1f} px (start {np.median(bs):.1f})  n={len(good)}")
if jout:
    json.dump({"hash": g["hash"], "ppw": ppw, "rows": [{k: r[k] for k in ("ci", "side", "sin", "b", "f")} for r in res], "good": [(r["ci"], r["side"]) for r in good]}, open(jout, "w"))
