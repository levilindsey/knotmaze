import json, sys, math
def load(p):
    d = json.load(open(p)); g = lambda k: d[k]["v"]
    return [(g("kJ")[i], g("kCa")[i], g("kCb")[i], g("kCx")[i], g("kCy")[i], g("kR")[i], g("kThru")[i]) for i in range(d["nK"])]
A = load(sys.argv[1]); B = load(sys.argv[2]); S = json.load(open(sys.argv[3]))["sites"]
keyA = {}
for k in A: keyA.setdefault(k[:3], []).append(k)
new = [k for k in B if not any(abs(k[3]-a[3]) < 1e-6 and abs(k[4]-a[4]) < 1e-6 for a in keyA.get(k[:3], []))]
print("new corners", len(new), "r>0:", sum(1 for k in new if k[5] > 0))
want = sys.argv[4].split(",") if len(sys.argv) > 4 else []
for s in S:
    if want and s["site"] not in want: continue
    near = [k for k in new if math.hypot(k[3]-s["wx"], k[4]-s["wy"]) < float(__import__("os").environ.get("RAD", 0.6))]
    if near: print(s["site"], [(k[0], k[1], k[2], round(k[5],3), round(math.hypot(k[3]-s["wx"], k[4]-s["wy"]),2)) for k in near])

