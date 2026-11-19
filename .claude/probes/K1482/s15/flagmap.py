# K1482 s15: which crossings the bake flagged near each named site (cap15 K15 {"log":true} writes k15log_gf.json:
# per crossing i, over/under chain, oC/uC, the over point x,y (world), the flag f, slots n, member feet fm and their
# |off| (fo), and mA: the over-arc offsets within +-1.5 of oC whose kept sample is a member).
#   python flagmap.py <k15log.json> <sites_gf.json> <site,site,...|all-flagged> [radius 0.9]
import json, sys, math
L = json.load(open(sys.argv[1]))
S = {s["site"]: s for s in json.load(open(sys.argv[2]))["sites"]}
names = sys.argv[3]
R = float(sys.argv[4]) if len(sys.argv) > 4 else 0.9
def row(e):
    mA = e["mA"]
    span = f"[{min(mA):+.2f},{max(mA):+.2f}] n{len(mA)}" if mA else "-"
    near = min((abs(a) for a in mA), default=None)
    return f"  x{e['i']:<3} o{e['oc']}@{e['oC']:<7} u{e['uc']}@{e['uC']:<7} f={e['f']} slots {e['n']:<3} feetM {e['fm']:<3} mA {span} nearest {near}"
if names == "all-flagged":
    for e in L:
        if e["f"]:
            d = sorted((math.hypot(s["wx"] - e["x"], s["wy"] - e["y"]), n) for n, s in S.items())[:2]
            print(row(e), " near", ", ".join(f"{n} {dd:.2f}" for dd, n in d))
    print(sum(1 for e in L if e["f"]), "flagged of", len(L))
else:
    for n in names.split(","):
        s = S[n]
        hits = sorted((math.hypot(s["wx"] - e["x"], s["wy"] - e["y"]), e) for e in L if math.hypot(s["wx"] - e["x"], s["wy"] - e["y"]) < R) if False else sorted(((math.hypot(s["wx"] - e["x"], s["wy"] - e["y"]), k) for k, e in enumerate(L)), key=lambda t: t[0])
        hits = [(d, L[k]) for d, k in hits if d < R]
        print(f"{n} ({s['kind']}):")
        for d, e in hits:
            print(f"  d {d:.2f}", row(e))
