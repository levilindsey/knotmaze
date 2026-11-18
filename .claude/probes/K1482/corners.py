import json, sys, math
T = json.load(open(sys.argv[1])); S = json.load(open(sys.argv[2])); names = sys.argv[3].split(","); rad = float(sys.argv[4]) if len(sys.argv) > 4 else 1.5
def A(k):
    v = T[k]; return v["v"] if isinstance(v, dict) and "__t" in v else v
keys = [k for k in T if k.startswith("k")]
print("scalars:", {k: T[k] for k in ("h", "W", "aa", "zt", "sigma", "rc") if k in T})
K = {k: A(k) for k in keys if isinstance(A(k), list)}
n = len(K["kCx"]); by = {s["site"]: s for s in S["sites"]}
for nm in names:
    s = by[nm]; print(f"== {nm} w=({s['wx']:.3f},{s['wy']:.3f})", {k: s[k] for k in s if k not in ("site","wx","wy","x","y")})
    for k in range(n):
        dd = math.hypot(K["kCx"][k] - s["wx"], K["kCy"][k] - s["wy"])
        if dd < rad:
            print(f"  k{k} d={dd:.2f} " + " ".join(f"{a[1:]}={K[a][k] if not isinstance(K[a][k], float) else round(K[a][k],3)}" for a in ("kJ","kCa","kCb","kR","kRmax","kRV","kThru","kG","kZa","kZb")))
