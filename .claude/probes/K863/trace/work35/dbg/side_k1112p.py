r"""K1112 Run P: the side test (K991) on every cusp entry a join out of m or u makes, read from a solves_k1113.py JSON:
side_min (u; the join's least clearance on the letter's side of the retraced stroke, negative = across it) must be at
least -0.05 u (the tolerance fw's -0.0134 u was accepted under). Also lists the attach (s_u in [lo, hi], BOUND at a
bound) and the solve status. Run from the trace dir:
  venv\Scripts\python.exe -I work35\dbg\side_k1112p.py <solves.json> <out.txt>"""
import json
import sys

TOL = -0.05
J = json.load(open(sys.argv[1]))
lines, bad = [], 0
for key in sorted(J):
    r = J[key]
    if r.get("entry_kind") != "cusp":
        continue
    sm = r.get("side_min")
    ok = sm is not None and sm >= TOL
    bad += 0 if ok else 1
    lines.append("%-4s side_min %8.4f u  %s  | attach s %6.2f in [%5.2f, %6.2f] %s | status %s nfev %s" % (
        r["pair"], sm if sm is not None else float("nan"), "ok  " if ok else "FAIL", r.get("s_u", -1), r.get("lo", -1),
        r.get("hi", -1), "BOUND" if "BOUND" in (r.get("note") or []) else "     ", r.get("status"), r.get("nfev")))
lines.append("%d cusp entries, %d below %.2f u" % (len(lines), bad, TOL))
open(sys.argv[2], "w", newline="\n").write("\n".join(lines) + "\n")
print("\n".join(lines))
