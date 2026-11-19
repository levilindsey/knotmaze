# K1482 s13: the count test for the joint-member outline cut (gf_look.ts lkGap, s13). A tick is an under arm's
# outline that the crossing cut stops a few px short of a fused joint's outline: in the site's box it is one ink
# component more than the closed line (the arm's stroke and the joint's stroke apart). Counts the 8-connected ink
# components (RGB sum <= 73) in each listed site's 48x48 device-px box and fails when any site has more than its limit.
#   python count13.py <gf.png> <sites_gf.json>            # the test (exit 1 on a fail)
#   python count13.py <gf.png> <sites_gf.json> --all      # every site's count, for picking the list
#   python count13.py <gf.png> <sites_gf.json> --specks <ref.png>   # new specks: ink components of <= 12 px that
#                                                         # touch no ink of ref (same hash); exit 1 when there are any
# Link A, K868 frozen state, hash fff8c9e5, border look (cap13.ps1): the limits FAIL on master (s13 raw/m, 20 of 20
# one over) and PASS on candidate c1 (patch_c1.json / c1_rule.diff, raw/c1 and the built tip raw/tip agree). Limits
# are c1's counts at the 20 sites where master has more and two loads of c1 agree. c1 is NOT a passing rule: --specks
# against raw/m finds 5 new ones (j36 2 px, j37 3 px, 1 px beside t64e, t10s, j16); see out/s13/step2.txt. A
# candidate passes this test when the limits hold AND --specks finds none.
import json, sys
import numpy as np
from PIL import Image

LIMITS = {}  # filled below from the s13 table
TABLE = """
j21=3 j46=3 j71=3 j83=3 j87=4 j102=4 j120=3 j122=3 j126=3 j140=2 j158=3
t2s=3 t16e=4 t27s=4 t30e=3 t34s=3 t36s=3 t62e=3 t73e=3 t76e=3
"""


def comps(m):
    H, W = m.shape; seen = np.zeros_like(m, bool); n = 0
    for y in range(H):
        for x in range(W):
            if m[y, x] and not seen[y, x]:
                n += 1; st = [(y, x)]; seen[y, x] = True
                while st:
                    a, b = st.pop()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            p, q = a + dy, b + dx
                            if 0 <= p < H and 0 <= q < W and m[p, q] and not seen[p, q]:
                                seen[p, q] = True; st.append((p, q))
    return n


def counts(frame, sites, names=None, R=24):
    F = np.asarray(Image.open(frame).convert("RGB")).astype(int).sum(-1) <= 73
    out = {}
    for s in sites:
        if names is not None and s["site"] not in names: continue
        cx, cy = int(round(s["x"])), int(round(s["y"]))
        out[s["site"]] = comps(F[cy - R:cy + R, cx - R:cx + R])
    return out


if __name__ == "__main__":
    frame, sp = sys.argv[1], sys.argv[2]
    sites = json.load(open(sp))["sites"]
    for ln in TABLE.split():
        k, v = ln.split("="); LIMITS[k] = int(v)
    if "--all" in sys.argv:
        print(json.dumps(counts(frame, sites))); sys.exit(0)
    if "--specks" in sys.argv:
        ink = lambda f: np.asarray(Image.open(f).convert("RGB")).astype(int).sum(-1) <= 73
        C, R = ink(frame), ink(sys.argv[sys.argv.index("--specks") + 1])
        P = np.array([[s["x"], s["y"]] for s in sites])
        H, W = C.shape; lab = np.zeros((H, W), np.int32); n = 0; found = []
        for y0, x0 in zip(*np.nonzero(C)):
            if lab[y0, x0]: continue
            n += 1; st = [(y0, x0)]; lab[y0, x0] = n; px = []
            while st:
                a, b = st.pop(); px.append((a, b))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        p, q = a + dy, b + dx
                        if 0 <= p < H and 0 <= q < W and C[p, q] and not lab[p, q]: lab[p, q] = n; st.append((p, q))
            if len(px) > 12 or any(R[a, b] for a, b in px): continue
            c = np.array(px).mean(0)[::-1]; i = int(np.sqrt(((P - c) ** 2).sum(-1)).argmin())
            found.append(f"({int(c[0])},{int(c[1])}) {len(px)} px, {np.sqrt(((P[i] - c) ** 2).sum()):.0f} px from {sites[i]['site']}")
        for f in found: print("NEW SPECK", f)
        print(f"{len(found)} new specks"); sys.exit(1 if found else 0)
    C = counts(frame, sites, set(LIMITS))
    bad = [(k, C[k], LIMITS[k]) for k in LIMITS if C[k] > LIMITS[k]]
    for k, c, l in bad: print(f"FAIL {k}: {c} components > {l}")
    print(f"{len(LIMITS) - len(bad)}/{len(LIMITS)} sites within their limit")
    sys.exit(1 if bad else 0)
