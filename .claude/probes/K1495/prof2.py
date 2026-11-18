# K1495: today's fill ramp against gf's fill and border ramps at the same crossing sides (one physics hash).
#   python prof2.py <geoDir> <col>... [--fls 0/0.14/0.5/1.2] [--sites ci:side,...] [--json out.json]
#   col = name=<dir>/<prefix>  (prefix f: fill coverage on the centreline; prefix b: the border look's two outlines)
# Ramp per side and fl: 10%-90% arc length along the under centreline (device px), with where it starts and ends
# (device px of arc from the crossing centre). Levels and helpers are K1492's prof.py (imported from there).
import json, sys, os, importlib.util
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
flag = lambda k, d=None: args[args.index(k) + 1] if k in args else d
pos = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or not args[i - 1].startswith("--"))]
gdir, cols = pos[0], [c.split("=", 1) for c in pos[1:]]
fls = flag("--fls", "0/0.14/0.5/1.2").split("/")
sites = [tuple(map(int, s.split(":"))) for s in flag("--sites").split(",")] if flag("--sites") else None

# borrow prof.py's functions without running its main body
src = open(os.path.join(HERE, "..", "K1492", "prof.py")).read()
cut = src.index("Ls = {}")
ns = {"__name__": "prof"}
sys_argv = sys.argv
sys.argv = ["prof.py", gdir]
exec(compile(src[:cut], "prof.py", "exec"), ns)
sys.argv = sys_argv
g, ppw, hpx = ns["g"], ns["ppw"], ns["hpx"]
lum, px, ramp, side_geom, border_raw, fill_raw, ref_range = (ns[k] for k in ("lum", "px", "ramp", "side_geom", "border_raw", "fill_raw", "ref_range"))

def ramp2(da, lv):
    # scan from the deepest cut sample in the first 60% of the side (not from the crossing): where a renderer draws
    # no gap at the over thread's edge, the over thread's own colour there read as full coverage (a 0 px "ramp")
    n = int(len(lv) * 0.6); vals = [(x, i) for i, x in enumerate(lv[:n]) if x == x]
    i0 = min(vals)[1] if vals else 0
    r, s = ramp(da[i0:], lv[i0:])
    return None if r is None else (round(r, 1), round(s, 1), round(s + r, 1))

L = {}
for name, path in cols:
    d, pre = path.rsplit("/", 1)
    for v in fls: L[(name, v)] = lum(f"{d}/{pre}_fl{v}.png")
first = cols[0][0]
hist = np.histogram(L[(first, fls[0])], bins=256, range=(0, 256))[0]; bgL = float(np.argmax(hist)) + 0.5

cand = [s for s in g["sides"] if (sites is None and not s["self"] and s["lim"] >= 2.0) or (sites is not None and (s["ci"], s["side"]) in sites)]
rows = []
for s in cand:
    geo = side_geom(s); da = geo[1]
    row = {"ci": s["ci"], "side": s["side"], "sin": round(geo[4], 2), "r": {}}
    for name, path in cols:
        pre = path.rsplit("/", 1)[1]
        if pre.startswith("f"):
            f0 = fill_raw(L[(name, fls[0])], geo); rr = ref_range(f0)
            far = np.nanmedian(rr) if rr else float("nan")
            for v in fls:
                fr = f0 if v == fls[0] else fill_raw(L[(name, v)], geo)
                row["r"][(name, v)] = ramp2(da, [(x - bgL) / max(far - bgL, 1e-3) if x == x else float("nan") for x in fr])
        else:
            P = geo[0]
            b0 = border_raw(L[(name, fls[0])], geo)
            cl = [px(L[(name, fls[0])], *p) for p in P]
            bgc = np.nanmedian(ref_range(cl)) if ref_range(cl) else float("nan")
            farb = {n: np.nanmedian(ref_range(b0[n])) if ref_range(b0[n]) else float("nan") for n in (1, -1)}
            for v in fls:
                braw = b0 if v == fls[0] else border_raw(L[(name, v)], geo)
                for n in (1, -1):
                    lv = [(bgc - x) / max(bgc - farb[n], 1e-3) if x == x else float("nan") for x in braw[n]]
                    row["r"][(name + ("+" if n > 0 else "-"), v)] = ramp2(da, lv) if bgc - farb[n] >= 5 else None
    rows.append(row)

keys = sorted({k[0] for r in rows for k in r["r"]}, key=lambda k: [c[0] for c in cols].index(k.rstrip("+-")) * 3 + (0 if k[-1] not in "+-" else 1 if k[-1] == "+" else 2))
def clean(r):
    for k in keys:
        if k[-1] in "+-": continue
        for v in fls:
            if r["r"].get((k, v)) is None: return False
        if r["r"][(k, fls[0])][0] > 3.5: return False
    return True
good = [r for r in rows if clean(r)]
print(f"hash {g['hash']} pxPerWorld {ppw:.2f} h {hpx:.1f}px sides {len(rows)} clean {len(good)} (nominal fl 1.2 = {1.2 * ppw:.1f} px of arc)")
fmt = lambda t: "    -     " if t is None else f"{t[0]:4.1f}@{t[1]:4.1f}"
show = good if sites is None else rows
for v in fls:
    print(f"\nfl {v}: ramp@start (device px of arc from the crossing centre)")
    print("site     sin  | " + " | ".join(f"{k:>10}" for k in keys))
    for r in show:
        print(f"x{r['ci']:<4}{'+' if r['side'] > 0 else '-'}  {r['sin']:.2f} | " + " | ".join(f"{fmt(r['r'].get((k, v))):>10}" for k in keys))
    meds = []
    for k in keys:
        xs = [r["r"][(k, v)][0] for r in good if r["r"].get((k, v))]
        meds.append(f"{np.median(xs):10.1f}" if xs else "         -")
    print(f"median (n={len(good)})  | " + " | ".join(meds))
if flag("--json"):
    json.dump({"hash": g["hash"], "ppw": ppw, "fls": fls, "keys": keys,
               "rows": [{"ci": r["ci"], "side": r["side"], "sin": r["sin"], "clean": r in good,
                         "r": {f"{k}|{v}": r["r"].get((k, v)) for k in keys for v in fls}} for r in rows]},
              open(flag("--json"), "w"), indent=0)
