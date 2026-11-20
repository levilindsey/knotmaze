# K1494 (27C): offline gate study over fade.mjs dotFeat rows: [x, y, cv, ct, spikeMax, maxNb, tRange].
#   python .claude/probes/K1494/dotstats.py <fadeDir> <fl>
import json, sys
d = json.load(open(f"{sys.argv[1]}/fade_fl{sys.argv[2]}.json"))
feats = []
for s in d["sides"]:
    for f in s.get("dotFeat", {}).get("gf", []):
        feats.append((s["ci"], s["side"], *f))
print(f"fl={sys.argv[2]} counted dots {len(feats)} over {sum(1 for s in d['sides'] if s['dots']['gf']>2)} sides>2")
def pct(a, p): return sorted(a)[min(len(a)-1, int(len(a)*p))] if a else float("nan")
for name, idx in [("cv", 4), ("ct", 5), ("spikeMax", 6), ("maxNb", 7), ("tRange", 8)]:
    a = [f[idx] for f in feats]
    print(f"  {name}: min {min(a):.3f} p10 {pct(a,.1):.3f} med {pct(a,.5):.3f} p90 {pct(a,.9):.3f} max {max(a):.3f}")
gates = {
    "spikeMax>0.12": lambda f: f[6] > 0.12,
    "spikeMax>0.04": lambda f: f[6] > 0.04,
    "tRange<0.20": lambda f: f[8] < 0.20,
    "tRange<0.10": lambda f: f[8] < 0.10,
    "maxNb<0.85": lambda f: f[7] < 0.85,
    "spikeMax>0.04 & tRange<0.20": lambda f: f[6] > 0.04 and f[8] < 0.20,
    "spikeMax>0.04 & tRange<0.10": lambda f: f[6] > 0.04 and f[8] < 0.10,
    "spikeMax>0.12 & tRange<0.20": lambda f: f[6] > 0.12 and f[8] < 0.20,
}
for name, g in gates.items():
    per = {}
    for f in feats:
        if g(f): per[(f[0], f[1])] = per.get((f[0], f[1]), 0) + 1
    bad = {k: v for k, v in per.items() if v > 2}
    print(f"  gate {name}: surviving dots {sum(per.values())}, sides>2 {len(bad)} {sorted(bad.items(), key=lambda kv: -kv[1])[:6]}")
