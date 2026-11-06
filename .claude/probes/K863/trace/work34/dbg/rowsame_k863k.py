# K863 J3k: copy of work28/dbg/rowsame_k990e.py (J3e's, untouched) by work34/dbg/mk_tools_k863k.py (K1212): rows
# matched by the id without its word number, every field compared but the label and the id, repeats listed;
# Run: venv\Scripts\python.exe -I work34\dbg\rowsame_k863k.py <a.json> <b.json> [<out.txt>]. J3e's header:
r"""K990 (J3e, v6.8): which census rows differ between two census JSONs (census_k1027.py run), NaN-aware, on every
field except the label; prints the differing pieces with the fields that differ, then a count of equal rows.
Run from the trace dir: venv\Scripts\python.exe -I work28\dbg\rowsame_k990e.py <a.json> <b.json>"""
import json
import math
import re
import sys


def same(x, y):
    if isinstance(x, float) and isinstance(y, float):
        return (math.isnan(x) and math.isnan(y)) or x == y
    if isinstance(x, list) and isinstance(y, list):
        return len(x) == len(y) and all(same(a, b) for a, b in zip(x, y))
    if isinstance(x, dict) and isinstance(y, dict):
        return x.keys() == y.keys() and all(same(x[k], y[k]) for k in x)
    return x == y


A, B = (json.load(open(p, encoding="utf-8")) for p in sys.argv[1:3])
OUT = sys.argv[3] if len(sys.argv) > 3 else None
# K863 J3k (K1212): a row's key is its id without the word number (w<n>:), so a word list's order and its repeats do not
# shift the match; every field is compared but the label and the id
key = lambda r: re.sub(r"^w\d+:", "", r["id"])
SKIP = ("label", "id")
L = [f"A = {sys.argv[1]}", f"B = {sys.argv[2]}"]
ia, ib = {}, {}
for r in A["rows"]:
    ia.setdefault(key(r), []).append(r)
for r in B["rows"]:
    ib.setdefault(key(r), []).append(r)
for nm, ix in (("A", ia), ("B", ib)):
    rep = {k: len(v) for k, v in ix.items() if len(v) > 1}
    L.append(f"{nm}: {sum(len(v) for v in ix.values())} rows, {len(ix)} ids, {len(rep)} ids repeated"
             + (": " + ", ".join(f"{k} x{n}" for k, n in sorted(rep.items())) if rep else ""))


def diff_of(a, b):
    return [f for f in sorted(set(a) | set(b)) if f not in SKIP and not same(a.get(f), b.get(f))]


neq, nsame, rep_same, rep_diff = 0, 0, 0, 0
for k in sorted(set(ia) & set(ib)):
    d = diff_of(ia[k][0], ib[k][0])
    if d:
        neq += 1
        L.append("%-40s %s" % (k[:40], ",".join(d)[:110]))
    else:
        nsame += 1
    for nm, ix in (("A", ia), ("B", ib)):
        for c in ix[k][1:]:
            d2 = diff_of(ix[k][0], c)
            if d2:
                rep_diff += 1
                L.append(f"repeat in {nm} of {k} differs from its first copy: {','.join(d2)[:100]}")
            else:
                rep_same += 1
oa, ob = sorted(set(ia) - set(ib)), sorted(set(ib) - set(ia))
L += ["only in A: " + k for k in oa] + ["only in B: " + k for k in ob]
L.append("ids: %d equal, %d differ, %d only in B, %d only in A; repeated copies: %d equal to their first, %d not"
         % (nsame, neq, len(ob), len(oa), rep_same, rep_diff))
print("\n".join(L))
if OUT:
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
