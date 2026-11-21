# K1581 / Muse batch 27 Run Y (27Y), Done 2: match census40.ts's mirror places for the
# ball40 pair (S37 "0" -> "", ink step 0.02, its own 8 px grouping) against the captured
# places of .claude/probes/K1578/out/ball40/places.txt, per maze, at a stated radius.
#   python match27y.py <ball40Out> <censusDir> [radius=48]
# <censusDir>/<maze>.json is census40.ts's out.json (places with n40 > 0 are the pair's).
# A captured place matches the nearest mirror place of the same maze within the radius;
# each mirror place matches at most one captured place (greedy, nearest first).
import json, math, os, sys
from collections import defaultdict

ball_out, census_dir = sys.argv[1], sys.argv[2]
R = float(sys.argv[3]) if len(sys.argv) > 3 else 48.0

cap = defaultdict(list)
for line in open(os.path.join(ball_out, "places.txt"), encoding="utf-8"):
    p = line.rstrip("\n").split("\t")
    if len(p) < 7:
        continue
    x, y = (float(v) for v in p[1].split(","))
    cap[p[0]].append({"x": x, "y": y, "site": p[5].replace("near ", ""), "line": line.rstrip("\n")})

mir = {}
for mz in cap:
    p = os.path.join(census_dir, mz + ".json")
    if not os.path.exists(p):
        mir[mz] = []
        continue
    d = json.load(open(p, encoding="utf-8"))
    mir[mz] = [q for q in d["places"] if q["n40"] > 0]

print(f"radius {R:g} px")
tot = [0, 0, 0, 0, 0]
for mz in sorted(cap):
    pairs = []
    for i, c in enumerate(cap[mz]):
        for j, m in enumerate(mir[mz]):
            dist = math.hypot(c["x"] - m["x"], c["y"] - m["y"])
            if dist <= R:
                pairs.append((dist, i, j))
    pairs.sort()
    used_c, used_m, matched = set(), set(), []
    for dist, i, j in pairs:
        if i in used_c or j in used_m:
            continue
        used_c.add(i); used_m.add(j); matched.append((i, j, dist))
    co = [c for i, c in enumerate(cap[mz]) if i not in used_c]
    mo = [m for j, m in enumerate(mir[mz]) if j not in used_m]
    print(f"{mz}: captured {len(cap[mz])}, mirror {len(mir[mz])}, matched {len(matched)}, "
          f"captured-only {len(co)}, mirror-only {len(mo)}")
    for i, j, dist in sorted(matched, key=lambda t: t[2]):
        print(f"  match {cap[mz][i]['x']:g},{cap[mz][i]['y']:g} {cap[mz][i]['site']} <-> "
              f"mirror {mir[mz][j]['x']},{mir[mz][j]['y']} {mir[mz][j]['site']} d={dist:.1f}")
    for c in co:
        print(f"  CAPTURED-ONLY {c['x']:g},{c['y']:g} {c['site']}")
    for m in mo:
        print(f"  MIRROR-ONLY {m['x']},{m['y']} {m['site']} n40 {m['n40']}")
    tot[0] += len(cap[mz]); tot[1] += len(mir[mz]); tot[2] += len(matched)
    tot[3] += len(co); tot[4] += len(mo)
print(f"TOTAL: captured {tot[0]}, mirror {tot[1]}, matched {tot[2]}, captured-only {tot[3]}, mirror-only {tot[4]}")
