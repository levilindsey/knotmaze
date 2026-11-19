# K1482 s11: write out/s11/b3_sites.txt: every b3 group (>= 10 px of changed ink vs base c198e005), its sheet, the pixels,
# the over arm numbers at its changed pixels (dbg3 frame: patch_dbg11c.json) and the verdict judged on the 4x sheets.
import json, sys
import numpy as np
from PIL import Image
r, out = sys.argv[1], sys.argv[2]
E = np.asarray(Image.open(r + "/dbg3/gf.png").convert("RGB")).astype(int)
F = np.asarray(Image.open(r + "/dbg3/gf_fill.png").convert("RGB")).astype(int)
ds = json.load(open(r + "/ds_base_b3.json"))
rows = [l for l in open(sys.argv[3]).read().split("\n")[1:] if "," in l and " " not in l.strip()]
sheets = [("b3_%d" % i, l) for i, l in enumerate(rows)]
where = {}
for sh, names in sheets:
    for n in names.strip().split(","): where[n] = sh.strip()
WORSE = "worse: today and base fade the under line out at the over line; b3 runs it in hard, a T with no fade"
V = {"b_j87": "BETTER: today abuts the over line with no fade (the over chain's joint fan); base leaves a ~4 px gap; b3 abuts",
     "b_t16e": "BETTER: today's under line runs into the over thread with no fade (b3_2, s10 cr_b3_t16e); base fades it; b3 joins. Least sure: today's tile sits off gf's geometry here",
     "b_t34s": "worse (small): a 1-2 px fade closed at the over line", "b_t75e": "worse (small): a 1-2 px fade closed at the over line"}
L = ["# K1482 s11 step 2: b3 (s10/patch_b3.json) vs base c198e005, link A, border look. Groups of >= 10 px changed ink",
     "# (s10 diffsites.py + s11 blobsites.py), judged on the 4x sheets b3_0..b3_7.png (today | base gf | b3 gf | diff).",
     "# d/h: arc from the crossing to the over chain's joint root along its home interval, in h (dbg3, patch_dbg11c.json),",
     "# median over the group's pixels; sin: the crossing's sinT; cj: the loop's cut there.",
     "# name          sheet gain loss   d/h   sin    cj  verdict"]
nb = nw = 0
for k, v in sorted(ds.items(), key=lambda kv: -(kv[1]["gain"] + kv[1]["loss"])):
    if v["gain"] + v["loss"] < 10 or not v["px"]: continue
    xs = sorted(p[0] for p in v["px"]); ys = sorted(p[1] for p in v["px"])
    nm = ("n%d_%d" % (xs[len(xs) // 2], ys[len(ys) // 2])) if k.startswith("none@") else "b_" + k
    vals = [(E[y, x][0] / 20, F[y, x][1] / 255, F[y, x][0] / 255) for x, y in v["px"] if not (E[y, x][0] >= 255)]
    m = np.median(np.array(vals), 0) if vals else (np.nan, np.nan, np.nan)
    vd = V.get(nm, WORSE); nb += vd.startswith("BETTER"); nw += vd.startswith("worse")
    L.append("%-14s %-5s %4d %4d %5.2f %5.2f %5.2f  %s" % (nm, where.get(nm, "?"), v["gain"], v["loss"], m[0], m[1], m[2], vd))
L.append("# totals: %d groups, better %d (j87, t16e), same 0, worse %d" % (nb + nw, nb, nw))
open(out, "w").write("\n".join(L) + "\n")
print("\n".join(L[-3:]))


