"""K1626: the crossings near one fused joint of a cap.mjs capture.

  python near_joint.py <cap_dir> <joint index> [radius_w=7]

Per crossing within radius widths of the joint's centroid: the passes, the
midpoint's distance, the angle between the threads and the passes' gap.
Then the joint members' chains, slot by slot for 10 slots each way: the
distance to the nearest particle of any OTHER chain, in widths.
"""
import json, math, sys

D, J = sys.argv[1], int(sys.argv[2])
R = float(sys.argv[3]) if len(sys.argv) > 3 else 7.0
S = json.load(open(f"{D}/gf_load1.json")); pos = S["positions"]; ch = S["chains"]; tw = S["threadWidth"]
slot = {}
for c, a in enumerate(ch):
    for s, p in enumerate(a): slot[p] = (c, s)
g = S["fused"][J]
jx = sum(pos[2*q] for q in g) / len(g); jy = sum(pos[2*q+1] for q in g) / len(g)
print(D, f"J{J} members", [slot[q] for q in g], "centroid", round(jx, 2), round(jy, 2))
def at(c, f):
    a = ch[c]; n = len(a); i = math.floor(f); t = f - i; p = a[i % n]; q = a[(i+1) % n]
    return ((pos[2*p]*(1-t) + pos[2*q]*t, pos[2*p+1]*(1-t) + pos[2*q+1]*t), (pos[2*q]-pos[2*p], pos[2*q+1]-pos[2*p+1]))
for xi, X in enumerate(S["xs"]):
    o, u = X["over"], X["under"]
    (a, da) = at(o["chain"], o["ctrl"]); (b, db) = at(u["chain"], u["ctrl"])
    m = ((a[0]+b[0])/2, (a[1]+b[1])/2); d = math.hypot(m[0]-jx, m[1]-jy) / tw
    if d > R: continue
    cs = abs(da[0]*db[0] + da[1]*db[1]) / (math.hypot(*da) * math.hypot(*db) + 1e-12)
    print(f"  X{xi} over c{o['chain']}@{o['ctrl']:.2f} under c{u['chain']}@{u['ctrl']:.2f} d {d:.2f}w "
          f"angle {math.degrees(math.acos(min(1, cs))):.0f} deg passgap {math.hypot(a[0]-b[0], a[1]-b[1])/tw:.2f}w")
others = [(p, slot[p][0]) for p in slot]
for q in g:
    c, s = slot[q]; n = len(ch[c])
    row = []
    for o in range(-10, 11):
        p = ch[c][(s + o) % n]
        best = min(math.hypot(pos[2*p]-pos[2*r], pos[2*p+1]-pos[2*r+1]) for r, cr in others if cr != c) / tw
        row.append(f"{o:+d}:{best:.2f}")
    print(f"  chain {c} slot {s}: nearest other chain (w) ", " ".join(row))
