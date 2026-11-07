r"""K863 J3m: the candidate's locality against J3L, piece by piece, after work34/dbg/local_k863k.py (J3k's, untouched).
For every word: J3L and the candidate assembled by gen_k863m (J3L's join_params have no "k863m" key, so its pieces are
gen_k863k's), with_ref off, every piece compared exactly (letters' strokes by their cubics; joins, leads and tails by
their quintic coefficients). A piece that differs is IN the candidate's spot when it is
  - the stroke of an own, unsheared letter X that a k863m form names: an exit form's stroke when the letter has a
    preset join out of it, a fin form's stroke when X ends the word;
  - a join out of such a letter whose candidate source is "k863m exit high|low";
  - a "k863m fin" tail, which replaces J3L's tail for the same letter (J3L's "k863k fin" tail of that letter, gone);
anything else that differs is OUTSIDE the spot (the check: 0). The words the candidate changes are listed (its census
runs on them), with each changed join's class and each fin tail's letter.
The join solver's result is memoised by its own arguments (as J3k's tool does), so each port pair is solved once.
Run from the trace dir:
  venv\Scripts\python.exe -I work37\dbg\local_k863m.py <J3L dir> <cand dir> <ports.json> <variant> <out.txt> <out.json>
      --words "<w,w,...>"     (a word may hold spaces: the list is split on commas)"""
import copy
import hashlib
import json
import os
import sys
import time

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work34", "dbg"))
sys.path.insert(2, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import gen_k863m as G  # noqa: E402
import gen_k1027 as G27  # noqa: E402
from k863lib import Font  # noqa: E402

U = 0.24
_solve = G27.solve_join
_memo = {}


def _plain(o):
    if isinstance(o, np.ndarray):
        return o.tolist()
    if isinstance(o, (list, tuple)):
        return [_plain(x) for x in o]
    if isinstance(o, dict):
        return {str(k): _plain(v) for k, v in o.items()}
    return o


def solve_memo(B, ports, Lk, Rk, dxR, shearR, pins):
    key = (id(B), id(ports), Lk, Rk, float(dxR), repr(_plain(shearR)), json.dumps(_plain(pins), sort_keys=True, default=str))
    if key not in _memo:
        _memo[key] = _solve(B, ports, Lk, Rk, dxR, shearR, pins)
    return copy.deepcopy(_memo[key])


G27.solve_join = solve_memo


def same_arr(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    return a.shape == b.shape and bool(np.array_equal(a, b))


def same_coeffs(c0, c1):
    return len(c0) == len(c1) and all(same_arr(a, b) for a, b in zip(c0, c1))


def md5(p):
    with open(p, "rb") as fh:
        return hashlib.md5(fh.read()).hexdigest()


def main():
    a = sys.argv[1:]
    i = a.index("--words")
    words = a[i + 1].split(",")
    a = a[:i] + a[i + 2:]
    bd, cd, pp, var, out_txt, out_json = a[:6]
    t_start = time.time()
    if md5(os.path.join(bd, "bodies.json")) != md5(os.path.join(cd, "bodies.json")):
        raise SystemExit("the candidate's bodies differ from J3L's: this tool compares join_params forms only")
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P0 = json.load(open(os.path.join(bd, "join_params.json")))
    P1 = json.load(open(os.path.join(cd, "join_params.json")))
    if "k863m" in P0:
        raise SystemExit("the base has k863m forms")
    F = P1.get("k863m", {})
    fins, exits = F.get("fin", {}), F.get("exit", {})
    ports = G.load_ports(pp, var)
    r = dict(changed_words=[], outside=[], inside=0, strokes=0, joins={}, tails={}, words=0)
    for w in words:
        A0 = G.assemble(font, B, P0, w, with_ref=False, ports=ports)
        A1 = G.assemble(font, B, P1, w, with_ref=False, ports=ports)
        r["words"] += 1
        chg = False
        if len(A0["letters"]) != len(A1["letters"]):
            r["outside"].append(f"{w}: letter count {len(A0['letters'])} -> {len(A1['letters'])}")
        exit_i = {j["iL"] for j in A1["joins"] if str(j.get("src", "")).startswith("k863m exit")}
        for l0, l1 in zip(A0["letters"], A1["letters"]):
            X = l0["ch"]
            own = str(A0["shaping"][l0["i"]].get("name", "")).split(".")[0] == X and not l0["sheared"]
            if len(l0["strokes"]) != len(l1["strokes"]):
                r["outside"].append(f"{w}: letter {X} stroke count")
            for si, (s0, s1) in enumerate(zip(l0["strokes"], l1["strokes"])):
                if same_arr(s0, s1):
                    continue
                spot = own and ((X in exits and l0["i"] in exit_i)
                                or (X in fins and l0["last"] and si == int(fins[X].get("stroke", 0))))
                if not spot:
                    r["outside"].append(f"{w}: letter {X} (i {l0['i']}) stroke {si}")
                    continue
                r["inside"] += 1
                r["strokes"] += 1
                chg = True
        for nm in ("joins", "leads"):
            if len(A0[nm]) != len(A1[nm]):
                r["outside"].append(f"{w}: {nm} count")
            for k_, (j0, j1) in enumerate(zip(A0[nm], A1[nm])):
                if same_coeffs(j0["coeffs"], j1["coeffs"]):
                    continue
                src = str(j1.get("src", ""))
                if nm == "joins" and src.startswith("k863m exit") and j0["L"] in exits:
                    r["inside"] += 1
                    chg = True
                    key = f"{j1['L']}{j1['R']} {src.split()[-1]}"
                    r["joins"][key] = r["joins"].get(key, 0) + 1
                else:
                    r["outside"].append(f"{w}: {nm[:-1]} {k_} ({j0.get('L', j0.get('ch'))}{j0.get('R', '')})")
        t0s, t1s = list(A0["tails"]), list(A1["tails"])
        used = [False] * len(t0s)
        for j1 in t1s:
            hit = next((i_ for i_, j0 in enumerate(t0s) if not used[i_] and j0["ch"] == j1["ch"]
                        and same_coeffs(j0["coeffs"], j1["coeffs"])), None)
            if hit is not None:
                used[hit] = True
                continue
            if j1.get("form") == "k863m fin" and j1["ch"] in fins:
                r["inside"] += 1
                chg = True
                r["tails"][j1["ch"]] = r["tails"].get(j1["ch"], 0) + 1
                gone = next((i_ for i_, j0 in enumerate(t0s) if not used[i_] and j0["ch"] == j1["ch"]), None)
                if gone is not None:
                    used[gone] = True
            else:
                r["outside"].append(f"{w}: tail ({j1['ch']}, {j1.get('form')})")
        for i_, j0 in enumerate(t0s):
            if not used[i_]:
                r["outside"].append(f"{w}: J3L's tail ({j0['ch']}, {j0.get('form')}) gone without a k863m fin")
        if chg:
            r["changed_words"].append(w)
    el = time.time() - t_start
    L_ = [f"K863 J3m locality: {len(words)} words, candidate {cd} against J3L ({bd}; ports {pp} {var}); "
          f"{len(_memo)} port pairs solved once each; {el:.0f} s", "",
          f"pieces in the spot that differ: {r['inside']} in {len(r['changed_words'])} words (strokes {r['strokes']}, "
          f"joins {sum(r['joins'].values())}, fin tails {sum(r['tails'].values())}); pieces OUTSIDE the spot that "
          f"differ: {len(r['outside'])}" + (" (" + "; ".join(r["outside"][:20]) + ")" if r["outside"] else ""),
          f"  changed words: {','.join(r['changed_words'])}",
          "  joins by pair and class: " + ", ".join(f"{k} x{v}" for k, v in sorted(r["joins"].items())),
          "  fin tails by letter: " + ", ".join(f"{k} x{v}" for k, v in sorted(r["tails"].items()))]
    txt = "\n".join(L_) + "\n"
    with open(out_txt, "w", encoding="utf-8") as fh:
        fh.write(txt)
    with open(out_json, "w", encoding="utf-8") as fh:
        json.dump({**r, "n_words": r["words"], "words": words}, fh, indent=1, default=float)
    print(txt)


if __name__ == "__main__":
    main()
