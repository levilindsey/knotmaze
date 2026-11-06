r"""K1112 Run P (22P): m's and u's exits on one port each. Writes work35/ports_k1112p.json = a copy of
work28/ports_k990e.json (v6.8, variant M) with new variants, each M plus exit records and nothing else
(no pins, no hints, no per-pair data, no body or template change):
  Pm10   M + m's exit: n's record (a merge at the end node, stretch [0, 10] u back from the end)
  Pu10   M + u's exit: i's record (the same record)
  Pmu10  M + both
The second candidates (task 5, one extra per letter, chosen from where the first candidates' failing
pairs differ: the largest distance sits at the join's start, arc 0, in 11 pairs per letter, at the
10 u stretch bound) take stretch [0, 2] u: Pm2, Pu2 and Pmu2_2. They are written by default; name
others on the command line, e.g. `mk_ports_k1112p.py m=5 u=20` (the first candidates stay).
Run from the trace dir: venv\Scripts\python.exe -I work35\dbg\mk_ports_k1112p.py [m=<L> u=<L> ...]"""
import copy
import json
import sys

SRC, OUT = "work28/ports_k990e.json", "work35/ports_k1112p.json"


def name(letter, L):
    return "P%s%g" % (letter, L)


def main():
    extra = {"m": 2.0, "u": 2.0}
    for a in sys.argv[1:]:
        k, v = a.split("=")
        assert k in ("m", "u"), a
        extra[k] = float(v)
    E = json.load(open(SRC, encoding="utf-8"))
    assert "exit" not in E["letters"]["m"], E["letters"]["m"]
    assert "exit" not in E["letters"]["u"], E["letters"]["u"]
    M = E["variants"]["M"]
    assert "exit" not in M.get("m", {}) and "exit" not in M.get("u", {}), (M.get("m"), M.get("u"))
    rec = {"m": copy.deepcopy(E["letters"]["n"]["exit"]), "u": copy.deepcopy(E["letters"]["i"]["exit"])}
    for L in (rec["m"], rec["u"]):
        assert L == {"kind": "merge", "node": "end", "stretch_u": [0, 10]}, L
    made = []

    # first candidates
    for X in ("m", "u"):
        V = copy.deepcopy(M)
        V[X] = dict(V.get(X, {}), exit=copy.deepcopy(rec[X]))
        E["variants"][name(X, 10)] = V
        made.append(name(X, 10))
    V = copy.deepcopy(M)
    for X in ("m", "u"):
        V[X] = dict(V.get(X, {}), exit=copy.deepcopy(rec[X]))
    E["variants"]["Pmu10"] = V
    made.append("Pmu10")
    # second candidates: one changed stretch per letter named on the command line
    both = {}
    for X, L in sorted(extra.items()):
        V = copy.deepcopy(M)
        r = copy.deepcopy(rec[X])
        r["stretch_u"] = [0, L]
        V[X] = dict(V.get(X, {}), exit=r)
        E["variants"][name(X, L)] = V
        made.append(name(X, L))
        both[X] = r
    if both:
        V = copy.deepcopy(M)
        for X in ("m", "u"):
            r = copy.deepcopy(both.get(X, rec[X]))
            V[X] = dict(V.get(X, {}), exit=r)
        nm = "Pmu%g_%g" % (extra.get("m", 10), extra.get("u", 10))
        E["variants"][nm] = V
        made.append(nm)
    E["about"] = (E.get("about", "") + " | K1112 Run P (22P): copy of work28/ports_k990e.json with variants "
                  + ", ".join(made) + ": each M plus m's exit (n's record) and/or u's exit (i's record), a merge at "
                  "the end node, stretch [0, 10] u (a named second candidate changes only that letter's stretch). "
                  "Made by work35/dbg/mk_ports_k1112p.py.")
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(E, fh, indent=1)
        fh.write("\n")
    print("wrote", OUT, "variants", ", ".join(E["variants"].keys()))


main()
