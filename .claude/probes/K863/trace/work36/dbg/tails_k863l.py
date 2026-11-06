r"""K863 J3l: every word-end tail of a build, measured: its length (u), its rise and run from the letter's exit (fu),
its start and end directions (deg), its curvature at the start, its minimum and maximum (/u), and the sign changes
of its curvature (an S), for one word per letter.
Run from the trace dir:
  venv\Scripts\python.exe -I work36\dbg\tails_k863l.py <gen module dir> <build dir> <ports.json> <variant> <words>"""
import importlib
import json
import math
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
from k863lib import Font  # noqa: E402

U = 0.24


def curv(P):
    d1 = np.gradient(P, axis=0)
    d2 = np.gradient(d1, axis=0)
    return (d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / np.maximum(np.linalg.norm(d1, axis=1) ** 3, 1e-12)


def main():
    gdir, bd, pp, var, words = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5].split(",")
    sys.path.insert(0, os.path.join(T, gdir))
    G = importlib.import_module([m[:-3] for m in os.listdir(os.path.join(T, gdir)) if m.startswith("gen_k863")][0])
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P = json.load(open(os.path.join(bd, "join_params.json")))
    ports = G.load_ports(pp, var)
    print(f"{'word':10s} {'X':2s} {'len u':>6s} {'run fu':>7s} {'rise fu':>7s} {'a0':>6s} {'a1':>6s} {'k0 /u':>7s} "
          f"{'kmin':>7s} {'kmax':>7s} {'signs':>5s}  form")
    for w in words:
        A = G.assemble(font, B, P, w, with_ref=False, ports=ports)
        lt = A["letters"][-1]
        tl = [j for j in A["tails"] if j["ch"] == lt["ch"]]
        if not tl:
            print(f"{w:10s} {lt['ch']:2s} (no tail)")
            continue
        j = tl[-1]
        Q = np.asarray(j["gen"], float)
        ln = float(np.linalg.norm(np.diff(Q, axis=0), axis=1).sum()) * U
        d0 = Q[1] - Q[0]
        d1 = Q[-1] - Q[-2]
        k = curv(Q) / U
        ki = k[3:-3]
        sg = int(np.sum(np.abs(np.diff(np.sign(ki[np.abs(ki) > 2e-4]))) > 0))
        print(f"{w:10s} {lt['ch']:2s} {ln:6.1f} {Q[-1][0] - Q[0][0]:7.1f} {Q[-1][1] - Q[0][1]:7.1f} "
              f"{math.degrees(math.atan2(d0[1], d0[0])):6.1f} {math.degrees(math.atan2(d1[1], d1[0])):6.1f} "
              f"{k[2]:7.4f} {ki.min():7.4f} {ki.max():7.4f} {sg:5d}  {j.get('form', '')}")


if __name__ == "__main__":
    main()
