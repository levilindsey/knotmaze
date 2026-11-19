# K1482 s11: turn diffsites.py's per-site changed-ink groups into tile centres. Each group of >= MIN px (gain + loss)
# becomes a pseudo-site at the median of its changed pixels (named <site> or n<x>_<y> for a group near no site), written
# beside the real sites so sheet9.py can tile it; prints the names, worst first, in sheets of 12.
#   python blobsites.py <ds.json> <sites.json> <out_sites.json> [env MIN=10]
import json, os, sys
ds, sp, op = sys.argv[1:4]
MIN = int(os.environ.get("MIN", 10))
S = json.load(open(sp))
rows = []
for k, v in json.load(open(ds)).items():
    if v["gain"] + v["loss"] < MIN or not v["px"]: continue
    xs = sorted(p[0] for p in v["px"]); ys = sorted(p[1] for p in v["px"])
    x, y = xs[len(xs) // 2], ys[len(ys) // 2]
    nm = ("n%d_%d" % (x, y)) if k.startswith("none@") else "b_" + k
    rows.append((v["gain"] + v["loss"], nm, x, y, v["gain"], v["loss"]))
rows.sort(key=lambda r: -r[0])
S["sites"] = S["sites"] + [{"site": r[1], "x": r[2], "y": r[3]} for r in rows]
json.dump(S, open(op, "w"))
print(len(rows), "groups >=", MIN, "px")
for i in range(0, len(rows), 12): print(",".join(r[1] for r in rows[i:i + 12]))
for r in rows: print("%-12s %4d,%4d gain %3d loss %3d" % (r[1], r[2], r[3], r[4], r[5]))
