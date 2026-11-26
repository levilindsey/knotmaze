"""K1626: the eye between a junction and a crossing of two of its own arms.

  python eyes.py <cap_master> <cap_mine> [max_ctrl=6]

A crossing whose two passes both lie within max_ctrl of one fused joint's
members (on their own chains) closes an eye with the joint: two arms leave
the joint and cross. Per eye: the joint-to-crossing distance and the
eye's opening (the largest, over one arm's stretch, of the distance to the
other arm's stretch, centre to centre) in thread widths; an opening under
1 width means the arms overlap edge to edge for part of the eye. Levi's
place is J138 x X282.
"""
import json, math, sys

MAXC = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0

def load(d):
    S = json.load(open(f"{d}/gf_load1.json")); pos = S["positions"]; ch = S["chains"]
    slot = {}
    for c, a in enumerate(ch):
        for s, p in enumerate(a): slot[p] = (c, s)
    return S, pos, ch, slot

def pt(pos, ch, c, f):
    a = ch[c]; n = len(a); i = math.floor(f); t = f - i
    p = a[i % n]; q = a[(i + 1) % n]
    return (pos[2*p]*(1-t) + pos[2*q]*t, pos[2*p+1]*(1-t) + pos[2*q+1]*t)

def eyes(d):
    S, pos, ch, slot = load(d); tw = S["threadWidth"]; out = {}
    for j, g in enumerate(S["fused"]):
        mem = [slot[q] for q in g]
        jx = sum(pos[2*q] for q in g) / len(g); jy = sum(pos[2*q+1] for q in g) / len(g)
        for xi, X in enumerate(S["xs"]):
            arms = []
            for P in (X["over"], X["under"]):
                best = None
                for (c, s) in mem:
                    if c != P["chain"]: continue
                    dc = P["ctrl"] - s
                    if abs(dc) <= MAXC and (best is None or abs(dc) < abs(best[1] - best[0])): best = (s, P["ctrl"])
                arms.append((P["chain"], best))
            if any(b is None for _, b in arms): continue
            (ca, (sa, fa)), (cb, (sb, fb)) = arms
            if ca == cb and sa == sb: continue
            A = [pt(pos, ch, ca, sa + (fa - sa) * k / 24) for k in range(25)]
            B = [pt(pos, ch, cb, sb + (fb - sb) * k / 24) for k in range(25)]
            def seg_d(p, Q):
                m = math.inf
                for u, v in zip(Q, Q[1:]):
                    dx, dy = v[0]-u[0], v[1]-u[1]; L = dx*dx + dy*dy
                    t = 0 if L == 0 else max(0, min(1, ((p[0]-u[0])*dx + (p[1]-u[1])*dy) / L))
                    m = min(m, math.hypot(p[0]-u[0]-t*dx, p[1]-u[1]-t*dy))
                return m
            opening = max(max(seg_d(p, B) for p in A), max(seg_d(p, A) for p in B)) / tw
            mx = (pt(pos, ch, ca, fa)[0] + pt(pos, ch, cb, fb)[0]) / 2; my = (pt(pos, ch, ca, fa)[1] + pt(pos, ch, cb, fb)[1]) / 2
            out[(j, xi)] = (math.hypot(mx - jx, my - jy) / tw, opening, abs(fa - sa) + abs(fb - sb))
    return out

EA, EB = eyes(sys.argv[1]), eyes(sys.argv[2])
keys = sorted(EA, key=lambda k: EA[k][1])
print(f"{len(EA)} joint eyes (master), {len(EB)} (mine)")
print("joint  xing  arms(ctrl)  dist master->mine (w)  opening master->mine (w)")
for k in keys:
    a = EA[k]; b = EB.get(k)
    flag = "  <- Levi" if k == (138, 282) else ""
    print(f"J{k[0]:<4} X{k[1]:<4} {a[2]:5.2f}   {a[0]:.2f} -> {b[0] if b else float('nan'):.2f}      {a[1]:.2f} -> {b[1] if b else float('nan'):.2f}{flag}")
for name, E in (("master", EA), ("mine", EB)):
    op = sorted(v[1] for v in E.values())
    print(f"{name}: openings min {op[0]:.2f}w, median {op[len(op)//2]:.2f}w, under 1.5w {sum(o < 1.5 for o in op)}, under 2w {sum(o < 2 for o in op)}")
