# K1198 (Muse batch 20 Run G) COPY of work32/dbg/rows_same_k1112cusp.py (untouched in
# .claude/probes/K863/trace/): argv-driven, no retarget needed.
# K1112 (J3i, v7.2) two censuses of the same words compared row by row (every field but the census label; NaN-aware via
# json.dumps), since a census file carries its label and so never matches byte for byte. Prints the rows that differ.
# Run: python -I work32\dbg\rows_same_k1112cusp.py <a.json> <b.json> [out.txt]
import json, sys
a, b = (json.load(open(p)) for p in sys.argv[1:3])
ra = {r["id"]: json.dumps(r, sort_keys=True) for r in a["rows"]}
rb = {r["id"]: json.dumps(r, sort_keys=True) for r in b["rows"]}
diff = [i for i in ra if ra[i] != rb.get(i)] + [i for i in rb if i not in ra]
same = "same, %d rows" % len(ra) if not diff else "DIFFER in %d of %d rows" % (len(diff), len(ra))
out = ["%s vs %s (labels %r, %r): rows %s" % (sys.argv[1], sys.argv[2], a.get("label"), b.get("label"), same)] + ["  " + i for i in diff]
open(sys.argv[3], "w").write("\n".join(out) + "\n") if len(sys.argv) > 3 else None
print("\n".join(out))
