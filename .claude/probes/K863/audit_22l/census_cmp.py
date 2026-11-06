# K863 audit 22L: compare the fresh census_check.json (kit census tool, this run,
# on work34/base) against work34/census_v68x.json row by row (id without word no.).
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
chk = {r["id"].split(":", 1)[1]: r for r in json.load(open(os.path.join(HERE, "census_check.json")))["rows"]}
ref = {r["id"].split(":", 1)[1]: r for r in json.load(open(os.path.join(T, "work34", "census_v68x.json")))["rows"]}
both = set(chk) & set(ref)
diff = 0
for k in sorted(both):
    a, b = chk[k], ref[k]
    for f in ("dist_max_u", "dist_mean_u", "peak_dkds_u", "facet"):
        av, bv = a.get(f) or 0, b.get(f) or 0
        if abs(av - bv) > 1e-6:
            print("DIFF", k, f, av, bv)
            diff += 1
print(f"compared {len(both)} rows shared with v68x, field diffs={diff}")
only = sorted(set(chk) - set(ref))
print("only in fresh check ( pairs the v68x word list does not hold ):")
for k in only:
    r = chk[k]
    print(f"  {k} type={r['type']} kind={r['kind']} dmax={r['dist_max_u']} dmean={r['dist_mean_u']}")
with open(os.path.join(HERE, "census_cmp.txt"), "w") as f:
    f.write(f"compared {len(both)} rows shared with v68x, field diffs={diff}\n")
    f.write("only in fresh check:\n")
    for k in only:
        r = chk[k]
        f.write(f"  {k} type={r['type']} kind={r['kind']} dmax={r['dist_max_u']} dmean={r['dist_mean_u']}\n")
