# K1482 s15: which sites have flagged slots near them (cap15 K15 {"log":true,...}: each logged crossing's fs is the
# flagged slots' under sample positions, world x,y pairs).
#   python slotmap.py <k15log.json> <sites_gf.json> [radius 0.6]
import json, sys, math
L = json.load(open(sys.argv[1]))
S = json.load(open(sys.argv[2]))["sites"]
R = float(sys.argv[3]) if len(sys.argv) > 3 else 0.6
pts = []
for e in L:
    fs = e.get("fs", [])
    for i in range(0, len(fs), 2):
        pts.append((fs[i], fs[i + 1], e["i"]))
print(len(pts), "flagged slots on", len({p[2] for p in pts}), "crossings of", len(L))
rows = []
for s in S:
    n = [p for p in pts if math.hypot(p[0] - s["wx"], p[1] - s["wy"]) < R]
    if n: rows.append((s["site"], len(n), sorted({p[2] for p in n})))
for r in sorted(rows, key=lambda r: -r[1]):
    print(f"  {r[0]:<6} {r[1]:>3} slots  crossings {r[2]}")
far = [p for p in pts if all(math.hypot(p[0] - s["wx"], p[1] - s["wy"]) >= R for s in S)]
print(len(far), "flagged slots away from every site")
