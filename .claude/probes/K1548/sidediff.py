# K1548 (27H): per-side OLD-dot difference between two fade runs (same state): which sides did a8d change?
#   python .claude/probes/K1548/sidediff.py <fadeJson1de> <fadeJsonA8d> [variant]
import json, sys
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
v = sys.argv[3] if len(sys.argv) > 3 else "gf"
ia = {(s["ci"], s["side"]): s for s in a["sides"]}
ib = {(s["ci"], s["side"]): s for s in b["sides"]}
rows = []
for k in sorted(set(ia) & set(ib)):
    da, db = ia[k]["dotsOld"][v], ib[k]["dotsOld"][v]
    if da != db:
        rows.append((k, ia[k]["at"], da, db, da - db))
print(f"common sides {len(set(ia) & set(ib))}, differing {len(rows)}; total 1de={sum(s['dotsOld'][v] for s in a['sides'])} a8d={sum(s['dotsOld'][v] for s in b['sides'])}")
for (ci, side), at, da, db, d in sorted(rows, key=lambda r: -abs(r[4]))[:25]:
    print(f"  x{ci}{'+' if side > 0 else '-'}@{at}: 1de={da} a8d={db} diff={d:+d}")
