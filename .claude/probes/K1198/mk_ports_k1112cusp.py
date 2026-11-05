r"""K1198 (Muse batch 20 Run G) COPY of work32/dbg/mk_ports_k1112cusp.py (K1112 J3i, untouched in
.claude/probes/K863/trace/): retargeted - SRC is the main checkout's J3h ports (read-only input,
.claude/probes/K863/trace/work31/ports_k1112c.json), OUT is this folder's ports_k1112cusp.json, and the
default m list is 1,2,3 so Plc1m (B = 1 u, maxfev 8000) is made beside Plc1, Plc2, Plc3, Plc2m and Plc3m.
Run from anywhere: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\mk_ports_k1112cusp.py
K1112 (J3i, v7.2): one cusp-entry rule for every low exit. Writes work32/ports_k1112cusp.json =
work31/ports_k1112c.json (J3h's, untouched; variant Pc10 = v7.1's ports) plus this stage's variants, each Pc10 with one
change, the same for every right letter with a cusp window (i, j, p, r, s, t, u, w, y; the letters whose entry record
has kind "cusp" under Pc10):
  Plc<B>  the cusp entry's retrace window starts at B u below the start cusp instead of 0 u: stretch_u [0, hi] ->
          [B, hi]. That record is the one every LOW exit (not in HIGH = bovw) reads. A high exit reads the letter's
          after_high record where it has one (i, j, p, s, t, u, w, y: unchanged), so r, the one cusp letter without
          one, gets an after_high record equal to its v7.1 entry (stretch [0, 20], its after_high_band_y_u hint,
          after bovw): br, or, vr and wr solve from the same record as before.
  Plc<B>m Plc<B> plus "maxfev": 8000 on the same records (the Nelder-Mead budget c's, f's and the high exits already
          carry): the larger budget changes no solve that converged within 3000 evaluations, only those stopped at
          MAXFEV. The after_high records stay as they were, so high exits keep their budget and their solves.
One rule, no per-pair data and no new pins (J3e's fr and fs pins set [2, 20] for their pairs alone; they stay).
Run from the trace dir: venv\Scripts\python.exe -I work32\dbg\mk_ports_k1112cusp.py [B,B,...] [Bm,Bm,...]
(defaults 1,2,3 and 2,3)"""
import copy
import json
import os
import sys

TRACE = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
SRC = os.path.join(TRACE, "work31", "ports_k1112c.json")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ports_k1112cusp.json")
BASE = "Pc10"


def main():
    Bs = [(float(x), False) for x in (sys.argv[1] if len(sys.argv) > 1 else "1,2,3").split(",")]
    Bs += [(float(x), True) for x in (sys.argv[2] if len(sys.argv) > 2 else "1,2,3").split(",")]
    E = json.load(open(SRC, encoding="utf-8"))
    V0 = E["variants"][BASE]
    eff = {X: (V0.get(X, {}).get("entry") or E["letters"].get(X, {}).get("entry")) for X in
           sorted(set(E["letters"]) | set(V0))}
    cusp = sorted(X for X, r in eff.items() if r is not None and r.get("kind") == "cusp")
    assert cusp == list("ijprstuwy"), cusp
    names = []
    for b, mf in Bs:
        V = copy.deepcopy(V0)
        for X in cusp:
            rec = copy.deepcopy(eff[X])
            lo, hi = rec["stretch_u"]
            assert lo == 0 and hi > b, (X, rec)
            if "after_high" not in rec:
                ah = copy.deepcopy(rec)
                ah["after"] = "bovw"
                rec["after_high"] = ah
            rec["stretch_u"] = [b, hi]
            if mf:
                rec["maxfev"] = 8000
            V.setdefault(X, {})["entry"] = rec
        n = "Plc%g" % b + ("m" if mf else "")
        E["variants"][n] = V
        names.append(n)
    E["about"] = (E.get("about", "") + " | K1198 copy (Muse batch 20 Run G): Plc1m added beside Plc2m/Plc3m. | K1112 (J3i, v7.2): copy of work31/ports_k1112c.json with variants %s: Pc10 "
                  "(v7.1) with every cusp entry's window (i, j, p, r, s, t, u, w, y) starting B u below the start cusp "
                  "after a low exit (stretch [B, hi]; the m variants add maxfev 8000 to the same records); r gets an after_high record equal to its v7.1 entry, so high exits "
                  "keep theirs. Made by work32/dbg/mk_ports_k1112cusp.py." % ", ".join(names))
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(E, fh, indent=1)
        fh.write("\n")
    print("wrote", OUT, "variants", ", ".join(E["variants"].keys()))


main()
