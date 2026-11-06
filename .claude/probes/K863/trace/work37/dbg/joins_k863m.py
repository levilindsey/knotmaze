r"""K863 J3m: the joins out of given left letters into a..z, as a build draws them: class, source, the exit and entry
frames (left-letter-local fu, degrees, curvature /u), the join's lowest point and its turn.
Run from the trace dir:
  venv\Scripts\python.exe -I work37\dbg\joins_k863m.py <build dir> <ports.json> <variant> <letters> [<gen module>]"""
import importlib
import json
import math
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work34", "dbg"))
sys.path.insert(2, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import k886lib as L  # noqa: E402
from k863lib import Font  # noqa: E402

U = 0.24


def ang(Tn):
    return math.degrees(math.atan2(Tn[1], Tn[0]))


def main():
    bd, pp, var, lets = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    G = importlib.import_module(sys.argv[5] if len(sys.argv) > 5 else "gen_k863k")
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P = json.load(open(os.path.join(bd, "join_params.json")))
    ports = G.load_ports(pp, var)
    for Lc in lets:
        for X in "abcdefghijklmnopqrstuvwxyz":
            w = Lc + X
            A = G.assemble(font, B, P, w, with_ref=False, ports=ports)
            x0 = A["letters"][0]["x"]
            x1 = A["letters"][1]["x"]
            for j in A["joins"]:
                if j["iL"] != 0:
                    continue
                fL, fR = j["fL"], j["fR"]
                g = np.asarray(j["gen"], float)
                d = np.diff(g, axis=0)
                ln = float(np.linalg.norm(d, axis=1).sum())
                a = np.unwrap(np.arctan2(d[:, 1], d[:, 0]))
                imin = int(np.argmin(g[:, 1]))
                port = "port" if "port" in j else "pre"
                print(f"{w}: {port:4s} cls {str(j.get('cls')):12s} src {str(j.get('src'))[:18]:18s} which {str(j.get('which'))[:10]:10s} "
                      f"fL ({fL[0][0] - x0:6.1f},{fL[0][1]:6.1f}) {ang(fL[1]):6.1f} k{fL[2] / U:7.4f} | "
                      f"fR ({fR[0][0] - x1:6.1f},{fR[0][1]:6.1f}) {ang(fR[1]):6.1f} k{fR[2] / U:7.4f} | "
                      f"min y {g[imin, 1] * U:5.1f}u at {imin / (len(g) - 1):.2f}; len {ln * U:5.1f}u; "
                      f"turn {math.degrees(a[-1] - a[0]):6.1f}; prm {['%.3f' % v for v in j['prm']] if j.get('prm') is not None else None}")


if __name__ == "__main__":
    main()
