r"""K863 J3n: try word-end (fin) forms for one letter and measure each tail, without building a candidate.
For a form (gen_k863n's k863m fin schema, as JSON) the letter is assembled alone (its own word) from <build dir>, cut
and tailed by gen_k863n.fin_tail, and the tail reported: length (u), run and rise from the cut (fu), start and end
directions, lowest point (fu and u), curvature min / max (/u), sign changes (an S), the largest |dk/ds| (/u^2), and
the closest approach to the letter's own kept stroke past the first <skip> u of tail (u; the ink is 9.2 u wide, so
under about 9.2 u the two inks touch), then how much of the tail past <skip> runs fused with that stroke (centre
lines under 9.2 u apart) and how much runs beside it as a thin sliver of paper (9.2 to 18 u apart: the hammock).
Run from the trace dir:
  venv\Scripts\python.exe -I work38\dbg\try_k863n.py <build dir> <letter> <form.json | inline JSON> [...] [--skip u]
A form may give "end_rel": [dx, dy] (fu from the cut's point) in place of "end"."""
import json
import math
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
T = os.path.dirname(os.path.dirname(_HERE))
sys.path.insert(0, _HERE)
sys.path.insert(1, os.path.join(T, "tools"))
import numpy as np  # noqa: E402
import gen_k863n as G  # noqa: E402
from k863lib import Font  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402

U = 0.24


def curv(P):
    d1 = np.gradient(P, axis=0)
    d2 = np.gradient(d1, axis=0)
    return (d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / np.maximum(np.linalg.norm(d1, axis=1) ** 3, 1e-12)


def main():
    a = sys.argv[1:]
    skip = 12.0
    if "--skip" in a:
        i = a.index("--skip")
        skip = float(a[i + 1])
        a = a[:i] + a[i + 2:]
    bd, X, forms = a[0], a[1], a[2:]
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P = json.load(open(os.path.join(bd, "join_params.json")))
    ports = G.load_ports(os.path.join(T, "work28", "ports_k990e.json"), "M")
    P0 = json.loads(json.dumps(P))
    P0.pop("k863m", None)
    P0.get("k863k", {}).get("fin", {}).pop(X, None)
    A = G.GK.assemble(font, B, P0, X, with_ref=False, ports=ports)
    lt = A["letters"][-1]
    print(f"{'form':58s} {'len':>6s} {'run':>6s} {'rise':>6s} {'a0':>6s} {'a1':>5s} {'ymin':>6s} {'yminu':>6s} "
          f"{'kmin':>7s} {'kmax':>7s} {'sc':>3s} {'dkmax':>7s} {'clear':>6s}")
    for fs in forms:
        f = json.loads(open(fs).read()) if os.path.exists(fs) else json.loads(fs)
        si = int(f.get("stroke", 0))
        if "end_rel" in f:
            _, fx, _ = G.cut_start(lt["strokes"][si], f)
            f = dict(f)
            f["end"] = [float(fx[0][0] + f["end_rel"][0] - lt["x"]), float(fx[0][1] + f["end_rel"][1])]
        cut, tl = G.fin_tail(lt["strokes"][si], f, lt["x"])
        Q = np.asarray(G.L.sample_c(tl["coeffs"], 1200), float)
        ln = float(np.linalg.norm(np.diff(Q, axis=0), axis=1).sum()) * U
        s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(Q, axis=0), axis=1))]) * U
        k = curv(Q) / U
        ki = k[5:-5]
        sg = np.sign(ki[np.abs(ki) > 2e-4])
        sc = int(np.sum(sg[1:] != sg[:-1])) if len(sg) > 1 else 0
        dk = np.abs(np.diff(ki) / np.maximum(np.diff(s[5:-5]), 1e-9))
        d0, d1 = Q[1] - Q[0], Q[-1] - Q[-2]
        own = np.vstack([G.L.samples(c, 2.0)[0] for c in
                         ([cut] + [lt["strokes"][j] for j in range(len(lt["strokes"])) if j != si])])
        tree = cKDTree(own)
        far = Q[s > skip]
        clear = float(tree.query(far)[0].min()) * U if len(far) else float("nan")
        dd = tree.query(Q)[0] * U
        ds = np.concatenate([[0.0], np.diff(s)])
        fused = float(ds[(s > skip) & (dd < 9.2)].sum())
        sliver = float(ds[(s > skip) & (dd >= 9.2) & (dd < 18.0)].sum())
        i = int(np.argmin(Q[:, 1]))
        lab = json.dumps({kk: v for kk, v in f.items() if kk not in ("stroke", "prm", "cut")}, separators=(",", ":"))
        print(f"{lab[:58]:58s} {ln:6.1f} {Q[-1][0] - Q[0][0]:6.1f} {Q[-1][1] - Q[0][1]:6.1f} "
              f"{math.degrees(math.atan2(d0[1], d0[0])):6.1f} {math.degrees(math.atan2(d1[1], d1[0])):5.1f} "
              f"{Q[i][1]:6.1f} {Q[i][1] * U:6.1f} {ki.min():7.4f} {ki.max():7.4f} {sc:3d} {dk.max():7.4f} {clear:6.2f}"
              f" fused {fused:5.1f} sliver {sliver:5.1f}   prm {[round(v, 3) for v in tl['prm']]} start {np.round(Q[0] - [lt['x'], 0], 1).tolist()} "
              f"end {np.round(Q[-1] - [lt['x'], 0], 1).tolist()}")


if __name__ == "__main__":
    main()
