# K1548 (27H): what separates 1de01c120's OLD-rule dots from a8d/master's? Reads fade_fl*.json dotFeatOld
# ([x,y,cv,ct,cv-maxNb4,cv-maxDiag,supporters]) for gf and reports, per file: old dots, and how many survive
# candidate extra gates (brightest-neighbour excess >= t; supporters == 0; both), plus per-side >2 counts.
#   python .claude/probes/K1548/dotstats.py <fadeJson> [more...]
import json, sys
from collections import Counter

for path in sys.argv[1:]:
    d = json.load(open(path))
    feats = [f for s in d["sides"] for f in s.get("dotFeatOld", {}).get("gf", [])]
    sup = Counter(f[6] for f in feats)
    print(f"{path}: sides={len(d['sides'])} oldDots={sum(s['dotsOld']['gf'] for s in d['sides'])} feat={len(feats)}")
    print("  supporters hist:", dict(sorted(sup.items())))
    for t in (0.02, 0.04, 0.06):
        n = sum(1 for f in feats if f[4] >= t)
        sides = sum(1 for s in d["sides"] if sum(1 for f in s.get("dotFeatOld", {}).get("gf", []) if f[4] >= t) > 2)
        print(f"  cv-maxNb4>={t}: dots={n} sides>2={sides}")
    n = sum(1 for f in feats if f[6] == 0)
    sides = sum(1 for s in d["sides"] if sum(1 for f in s.get("dotFeatOld", {}).get("gf", []) if f[6] == 0) > 2)
    print(f"  supporters==0: dots={n} sides>2={sides}")
    n = sum(1 for f in feats if f[5] >= 0.08)
    sides = sum(1 for s in d["sides"] if sum(1 for f in s.get("dotFeatOld", {}).get("gf", []) if f[5] >= 0.08) > 2)
    print(f"  cv-maxDiag>=0.08: dots={n} sides>2={sides}")
