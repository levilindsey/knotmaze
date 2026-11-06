r"""K863 J3l: a word's last letter as gen_k863k draws it, cubic by cubic (body-local fu, the letter's origin taken
off): each cubic's ends, directions and curvature (/u), its length (u), and the word's tail, sampled.
Run from the trace dir:
  venv\Scripts\python.exe -I work36\dbg\anl_k863l.py <build dir> <ports.json> <variant> <word> [<word> ...]"""
import json
import math
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work34", "dbg"))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import k886lib as L  # noqa: E402
import gen_k863k as G  # noqa: E402
from k863lib import Font  # noqa: E402

U = 0.24


def bez_pts(b, n=200):
    b = np.asarray(b, float)
    t = np.linspace(0.0, 1.0, n)[:, None]
    return ((1 - t) ** 3) * b[0] + 3 * ((1 - t) ** 2) * t * b[1] + 3 * (1 - t) * t * t * b[2] + t ** 3 * b[3]


def main():
    bd, pp, var, words = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P = json.load(open(os.path.join(bd, "join_params.json")))
    ports = G.load_ports(pp, var)
    for w in words:
        A = G.assemble(font, B, P, w, with_ref=False, ports=ports)
        lt = A["letters"][-1]
        x0 = lt["x"]
        g = A["shaping"][lt["i"]]
        print(f"== {w!r}: last letter {lt['ch']} glyph {g['name']} origin {x0:.2f}; strokes {len(lt['strokes'])}")
        for si, st in enumerate(lt["strokes"]):
            print(f"  stroke {si}: {len(st)} cubics")
            for k, b in enumerate(st):
                b = np.asarray(b, float)
                p0, T0, k0 = L.bez_frame(b, 0.0)
                p1, T1, k1 = L.bez_frame(b, 1.0)
                ln = float(np.linalg.norm(np.diff(bez_pts(b), axis=0), axis=1).sum())
                print(f"    {k:3d} ({k - len(st):3d}): ({p0[0] - x0:7.1f},{p0[1]:6.1f}) "
                      f"{math.degrees(math.atan2(T0[1], T0[0])):7.1f} k {k0 / U:8.4f} -> ({p1[0] - x0:7.1f},{p1[1]:6.1f}) "
                      f"{math.degrees(math.atan2(T1[1], T1[0])):7.1f} k {k1 / U:8.4f} /u; {ln * U:6.1f} u")
        for j in A["tails"]:
            if j["ch"] == lt["ch"]:
                Pq = L.sample_c(j["coeffs"], 9)
                print(f"  tail: " + " ".join(f"({x - x0:.0f},{y:.0f})" for x, y in Pq))


if __name__ == "__main__":
    main()
