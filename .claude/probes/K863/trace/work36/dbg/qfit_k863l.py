r"""K863 J3l: Q1 (J3k's q word-end tail, no step), with its slight S near the exit smoothed: Q1 leaves q's exit at
9.26 deg and dips to about 4.5 deg before it rises to its end angle (41 deg), a right turn and then a left one. The
refit keeps Q1's end frame and stays as close to Q1 as it can (Hausdorff + 0.5 x mean, fu, against Q1's curve) while
its direction never falls below the exit angle and its curvature never turns right (k >= 0: one way, as the exit's own
curvature turns), with J3k's other penalties (a0 >= 0.15, the census exit-seam dk < 5e-4 /u, |k| <= 1.5 x Q1's peak).
It reports where along the tail the new curve parts from Q1 by more than 0.25 u.
Run from the trace dir:
  venv\Scripts\python.exe -I work36\dbg\qfit_k863l.py <bodies.json> <join_params.json> <Q1 qfit.json> <out.json>"""
import json
import math
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work34", "dbg"))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
from scipy.optimize import minimize  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402
import k886lib as L  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
import census_k863k as C  # noqa: E402
from qfit_k863k import curve  # noqa: E402

U = 0.24


def main():
    B = json.load(open(sys.argv[1]))
    P = json.load(open(sys.argv[2]))
    prmQ = [float(v) for v in json.load(open(sys.argv[3]))["prm"]]
    out = sys.argv[4]
    q = P["tail_letter"]["q"]
    fx = L.frame_at(B["q"]["exit"], 0.0)
    fT = L.tail_frame(fx, q["offset"], q["angle"])
    th0 = math.degrees(math.atan2(fx[1][1], fx[1][0]))
    th1 = float(q["angle"])
    body = B["q"]["strokes"][-1]["beziers"]
    _, PQ, _, kQ, _ = curve(L.connector(fx, fT, prmQ), 2000)
    kref = float(np.abs(kQ).max())
    tQ = cKDTree(PQ)

    def numbers(prm):
        c = L.connector(fx, fT, prm)
        t, Pc, sp, k, ang = curve(c, 1200)
        dA = cKDTree(Pc).query(PQ)[0]
        dB = tQ.query(Pc)[0]
        sm = C.seam(FN.conn_beziers(c), body, False, True)
        s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(Pc, axis=0), axis=1))])
        far = np.nonzero(dB * U > 0.25)[0]
        return dict(haus=float(max(dA.max(), dB.max())), mean=float(0.5 * (dA.mean() + dB.mean())),
                    ang_min=float(ang.min()), ang_max=float(ang.max()), kmin=float(k.min()), kmax=float(np.abs(k).max()),
                    sp_min=float(sp.min()), len=float(s[-1]), seam=sm,
                    parts=(float(s[far[0]]) * U, float(s[far[-1]]) * U) if len(far) else None,
                    s=s, k=k, ang=ang)

    def cost(x):
        a0, a1, b0, b1 = x
        if a0 <= 0.01 or a1 <= 0.01:
            return 1e6
        n = numbers(list(x))
        pen = 200.0 * max(0.0, 0.15 - a0)
        pen += 50.0 * max(0.0, th0 - n["ang_min"]) + 5.0 * max(0.0, n["ang_max"] - (th1 + 15.0))
        pen += 1e5 * max(0.0, -n["kmin"])
        pen += 1e4 * max(0.0, n["seam"]["dk_u"] - 4e-4)
        pen += 500.0 * max(0.0, n["kmax"] - 1.5 * kref)
        return n["haus"] + 0.5 * n["mean"] + pen

    starts = [prmQ, [0.3, prmQ[1], 0.0, prmQ[3]], [0.5, 1.0, 0.0, 0.0], [0.8, 1.2, 0.0, 0.0], [0.4, 1.5, -1.0, -2.0],
              [0.6, 1.0, 1.0, -3.0]]
    best = None
    for s0 in starts:
        r = minimize(cost, np.asarray(s0, float), method="Nelder-Mead",
                     options=dict(maxiter=2500, xatol=1e-6, fatol=1e-6))
        if best is None or r.fun < best.fun:
            best = r
        print(f"start {[round(v, 3) for v in s0]} -> prm {[round(float(v), 5) for v in r.x]} cost {r.fun:.4f}")
    prm = [float(v) for v in best.x]
    lines = [f"K863 J3l: q's word-end tail, Q1 smoothed (end frame kept: offset {q['offset']}, angle {th1:.2f} deg; exit "
             f"angle {th0:.2f} deg, exit k {fx[2]:.5f} /fu; direction >= the exit angle, k >= 0)"]
    for nm, pr in (("Q1", prmQ), ("Q1s", prm)):
        n = numbers(pr)
        q8 = [int(i) for i in np.linspace(0, len(n["s"]) - 1, 9)]
        pa = n["parts"]
        where = "nowhere" if pa is None else f"{pa[0]:.2f}..{pa[1]:.2f} u of its length"
        lines.append(f"  {nm}: prm [{', '.join(f'{v:.5f}' for v in pr)}]; vs Q1: Hausdorff {n['haus'] * U:.2f} u, mean "
                     f"{n['mean'] * U:.2f} u, parts from Q1 by > 0.25 u over {where}; "
                     f"direction {n['ang_min']:.2f}..{n['ang_max']:.2f} deg; k min {n['kmin'] / U:.4f} /u, |k| max "
                     f"{n['kmax'] / U:.4f} /u; min speed {n['sp_min']:.2f}; length {n['len'] * U:.2f} u; census exit seam: "
                     f"gap {n['seam']['gap_u']:.2e} u, angle {n['seam']['ang_deg']:.3g} deg, dk {n['seam']['dk_u']:.3g} /u")
        lines.append("      at s (u) " + " ".join(f"{n['s'][i] * U:.1f}" for i in q8) + ": dir " + " ".join(
            f"{n['ang'][i]:.1f}" for i in q8) + "; k /u " + " ".join(f"{n['k'][i] / U:.3f}" for i in q8))
    print("\n".join(lines))
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(dict(prm=prm, prm_q1=prmQ, text=lines), fh, indent=1)


if __name__ == "__main__":
    main()
