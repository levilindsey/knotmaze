# K1198 Run G (Muse batch 22, 22G) task 6: the gates table, bench against rebuild.
# Bench = work33/census_v68x.json (v6.8, J3i's words, stock font); rebuild =
# v68_22g/census_22g.json (same base and ports M, ligature-emptied font). Counts
# are recomputed from the rows with the census's own definitions (G2: gap <
# 0.01 u, angle < 0.05 deg, dk < 5e-4 /u; over budget: dmax over the row's
# budget) and checked against the bench txt's printed totals. The glyph-for-
# glyph result (shape_gate_22g.txt) and the piece comparison (same_22g.txt,
# J3j's same_k863j.py) sit beside the table; side is the ij join's (ij_check).
# K1212's kit faults touch none of these numbers: the counts read the census
# JSON directly (not SU.g2, whose angle field never matches), the piece
# comparison is same_k863j.py (rowsame's word-number keying worked around),
# and the bench word list's duplicate entries are kept as the bench ran them.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\gates_22g.py
import json
import math
import os
import re
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))


def same(x, y):
    if isinstance(x, float) and isinstance(y, float):
        return (math.isnan(x) and math.isnan(y)) or x == y
    if isinstance(x, list) and isinstance(y, list):
        return len(x) == len(y) and all(same(a, b) for a, b in zip(x, y))
    if isinstance(x, dict) and isinstance(y, dict):
        return x.keys() == y.keys() and all(same(x[k], y[k]) for k in x)
    return x == y


def strip_id(i):
    return re.sub(r"^w\d+:", "", i)


def counts(rows):
    seams_bad = 0
    for r in rows:
        for s in r.get("seams", []):
            if s.get("designed"):
                continue
            if not (s["gap_u"] < 0.01 and s["ang_deg"] < 0.05 and s["dk_u"] < 5e-4):
                seams_bad += 1
    return dict(
        pieces=len(rows),
        joins=sum(1 for r in rows if r.get("type") == "join"),
        hooks=sum(1 for r in rows if r.get("hooks")),
        spikes=sum(1 for r in rows if (r.get("spikes") or 0) > 0),
        rough=sum(1 for r in rows if r.get("rough") == "FAIL"),
        seams=seams_bad,
        over=sum(1 for r in rows
                 if isinstance(r.get("dist_max_u"), (int, float))
                 and r["dist_max_u"] == r["dist_max_u"] and r["dist_max_u"] > r.get("budget", 2.5)),
        solved=sum(1 for r in rows if r.get("type") == "join" and "solve" in r),
        status_bad=sum(1 for r in rows if r.get("solve", {}).get("status") not in (None, 0)),
    )


def main():
    bench = json.load(open(os.path.join(T, "work33", "census_v68x.json"), encoding="utf-8"))
    reb = json.load(open(os.path.join(KDIR, "v68_22g", "census_22g.json"), encoding="utf-8"))
    cb, cr = counts(bench["rows"]), counts(reb["rows"])
    # first divergent row in bench JSON order (the census's badness order)
    reb_map = {}
    for r in reb["rows"]:
        reb_map.setdefault(strip_id(r["id"]), []).append(r)
    used = {}
    first = "none"
    for r in bench["rows"]:
        k = strip_id(r["id"])
        i = used.get(k, 0)
        used[k] = i + 1
        lst = reb_map.get(k, [])
        other = lst[i] if i < len(lst) else None
        if other is None or any(not same(r.get(f), other.get(f))
                                for f in set(r) | set(other) if f not in ("label", "id")):
            first = f"{r['id']} (word {r['word']!r})"
            break
    ijc = json.load(open(os.path.join(KDIR, "ij_check_22g.json"), encoding="utf-8"))
    ij_join = ijc["ij"]["nolig (22G rule)"]["joins"][0]
    shape = open(os.path.join(KDIR, "shape_gate_22g.txt"), encoding="utf-8").read().splitlines()
    same_lines = open(os.path.join(KDIR, "same_22g.txt"), encoding="utf-8").read().splitlines()
    rows = [
        ("pieces", cb["pieces"], cr["pieces"]),
        ("joins", cb["joins"], cr["joins"]),
        ("hooks (pieces with)", cb["hooks"], cr["hooks"]),
        ("spikes (pieces with)", cb["spikes"], cr["spikes"]),
        ("rough FAIL", cb["rough"], cr["rough"]),
        ("undesigned seams not G2", cb["seams"], cr["seams"]),
        ("over budget", cb["over"], cr["over"]),
        ("solved joins / status not 0", f"{cb['solved']} / {cb['status_bad']}",
         f"{cr['solved']} / {cr['status_bad']}"),
        ("side, ij join side_min_u", "no ij join (ligature)",
         f"{ij_join['side_min_u']:.4f} u (status {ij_join['status']})"),
    ]
    lines = ["K1198 22G gates: bench v6.8 (work33/census_v68x) against the rebuild "
             "(v68_22g/census_22g, ligatures emptied, ports M)",
             f"{'gate':28s} {'bench':>22s} {'rebuild':>22s}"]
    lines += [f"{n:28s} {str(a):>22s} {str(b):>22s}" for n, a, b in rows]
    lines.append(f"first divergent row (bench order): {first}")
    lines.append(f"ij join font distance (font's cnct.mod_n_n): {ij_join['dist_u']:.4f} u, cls {ij_join['cls']}")
    lines.append("glyph for glyph (shape_gate_22g.txt): " + "; ".join(
        l.strip() for l in shape if l.startswith(("strings without", "strings with", "pairs still"))))
    lines.append("pieces (same_22g.txt, same_k863j.py): " + same_lines[1].strip())
    bad = [l.strip() for l in same_lines if l.strip().startswith(("differ:", "only in"))]
    keys = [re.sub(r"^(differ|only in [AB]):\s*", "", l) for l in bad]
    outside = [l for l, k in zip(bad, keys) if not k.startswith("ij:")]
    lines.append(f"same_22g differing/only pieces: {len(bad)}; outside the word ij: {len(outside)} {outside[:5]}")
    out = os.path.join(KDIR, "gates_22g.txt")
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
