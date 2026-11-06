r"""K863 J3j: census rows compared NaN-aware on every field but the label and the id (same() copied from
work28/dbg/rowsame_k990e.py, J3e's, untouched), matched by the id without its word number, so that censuses run on
different word lists compare piece by piece; optionally only the pieces whose pair holds one of the given letters (a
join LR, a lead ^X, a tail X$). With --dumps, also the account dumps (work33/account/<ver>.json, account_k863j.py):
every piece (joins, leads, tails, strokes) whose pair or letter holds one of the letters, raw coefficients equal or not.
Run from the trace dir:
  venv\Scripts\python.exe -I work33\dbg\same_k863j.py <a.json> <b.json> <out.txt> [letters] [--dumps <a> <b>]"""
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


def rows(p, letters):
    out = {}
    for r in json.load(open(p))["rows"]:
        if letters and not set(r.get("pair", "")) & set(letters):
            continue
        out[re.sub(r"^w\d+:", "", r["id"])] = r
    return out


def main():
    a, b, out = sys.argv[1:4]
    rest = sys.argv[4:]
    dumps = None
    if "--dumps" in rest:
        i = rest.index("--dumps")
        dumps = rest[i + 1:i + 3]
        rest = rest[:i] + rest[i + 3:]
    letters = rest[0] if rest else ""
    A, B = rows(a, letters), rows(b, letters)
    common = sorted(set(A) & set(B))
    diff = []
    for k in common:
        f = [x for x in sorted(set(A[k]) | set(B[k])) if x not in ("label", "id") and not same(A[k].get(x), B[k].get(x))]
        if f:
            diff.append((k, f))
    L = [f"K863 J3j: {a} vs {b}" + (f", the pieces whose pair holds {letters}" if letters else ""),
         f"census rows: {len(A)} in A, {len(B)} in B, {len(common)} in both: {len(common) - len(diff)} equal, "
         f"{len(diff)} differ; only in A {len(set(A) - set(B))}, only in B {len(set(B) - set(A))}"]
    L += [f"  differ: {k}: {','.join(f)}" for k, f in diff]
    L += [f"  only in A: {k}" for k in sorted(set(A) - set(B))]
    L += [f"  only in B: {k}" for k in sorted(set(B) - set(A))]
    if dumps:
        P, Q = (json.load(open(p))["pieces"] for p in dumps)
        sel = sorted(k for k in set(P) & set(Q) if not letters or set(P[k]["pair"]) & set(letters))
        dd = [k for k in sel if P[k]["raw"] != Q[k]["raw"]]
        L.append(f"account dumps {dumps[0]} vs {dumps[1]}: {len(sel)} pieces in both, {len(sel) - len(dd)} with equal "
                 f"raw coefficients, {len(dd)} differ")
        L += [f"  differ: {k} ({P[k]['t']})" for k in dd]
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    print("\n".join(L[:2] + [x for x in L[2:] if x.startswith("account")] + L[2:12]))


if __name__ == "__main__":
    main()
