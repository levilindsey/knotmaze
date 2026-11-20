# K1525 s1: the K1419 rows' world points to device px (meta.view: dev = (p * s + view.xy) * dsf), and a sheet spec
import json, sys, os
base = sys.argv[1]; tip = sys.argv[2] if len(sys.argv) > 2 else None; out = sys.argv[3] if len(sys.argv) > 3 else None
R = [("K1419 r1 mdt 24.50,10.58", "mdt", 24.50, 10.58), ("K1419 r2 mdt 22.90,2.44", "mdt", 22.90, 2.44),
     ("K1419 r3 mdt 22.42,2.92", "mdt", 22.42, 2.92), ("K1419 r4 mdt 24.05,10.43", "mdt", 24.05, 10.43),
     ("K1419 r11 g41 19.60,30.87", "g41", 19.60, 30.87), ("K1419 r13 g41 31.05,12.20", "g41", 31.05, 12.20)]
rows = {}
for lab, sc, x, y in R:
    for side in ("today", "gf"):
        m = json.load(open(os.path.join(base, f"{sc}_{side}", "meta.json")))
        v = m["view"]; d = m["job"].get("dsf", 2)
        print(lab, side, m.get("hash"), round((x * v["s"] + v["x"]) * d, 1), round((y * v["s"] + v["y"]) * d, 1))
    rows[lab] = (sc, round((x * v["s"] + v["x"]) * d), round((y * v["s"] + v["y"]) * d))
for look, fls in (("b", ("0.14", "1.2")), ("f", ("0.14", "1.2"))):
    for sc in ("mdt", "g41"):
        fl = fls if sc == "mdt" else ("0", "1.2")
        cols = [["today's", os.path.join(base, f"{sc}_today")], ["master gf", os.path.join(base, f"{sc}_gf")]]
        if tip: cols.append(["my tip", os.path.join(tip, f"{sc}_gf")])
        spec = {"out": os.path.join(out or base, f"k1419_{sc}_{look}.png"), "cols": cols, "dist": 32,
                "rows": [[f"{lab} {look} fl {v}", f"{look}_fl{v}.png", cx, cy] for lab, (s2, cx, cy) in rows.items() if s2 == sc for v in fl]}
        json.dump(spec, open(os.path.join(os.path.dirname(__file__), f"spec_k1419_{sc}_{look}{'_tip' if tip else ''}.json"), "w"), indent=1)
