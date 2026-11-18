# K1482: sites.tsv (site, x, y, class, px, speck2, speck3) from the eye classes + specks.py's counts, and the class counts.
#   python sweep_table.py <classes.txt> <sites.json> <specks.tsv> <out sites.tsv>
import csv, json, sys
from collections import Counter
cls_path, sites_path, specks_path, out = sys.argv[1:]
C = {}
for ln in open(cls_path):
    if ln.strip() and not ln.startswith("#"):
        s, c, px = ln.split(); C[s] = (c, int(px))
SP = {r["site"]: r for r in csv.DictReader((l for l in open(specks_path) if not l.startswith("#")), delimiter="\t")}
S = json.load(open(sites_path))["sites"]
with open(out, "w", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n")
    w.writerow(["site", "kind", "x", "y", "class", "px", "speck2", "speck3"])
    for s in S:
        c, px = C.get(s["site"], ("clean", 0)); sp = SP.get(s["site"], {})
        w.writerow([s["site"], s["kind"], round(s["x"]), round(s["y"]), c, px, sp.get("speck2", ""), sp.get("speck3", "")])
cnt = Counter(C.get(s["site"], ("clean", 0))[0] for s in S)
print(" ".join(f"{k} {v}" for k, v in cnt.most_common()), f"(sites {len(S)})")
order = sorted(C, key=lambda k: -C[k][1])
print("ONLY=" + ",".join(order))
