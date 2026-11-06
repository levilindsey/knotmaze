r"""K863 J3k task 5: a new prm (a0, a1, b0, b1) for q's word-end tail (join_params tail_letter.q) that keeps v6.8's
tail shape (same end frame: the offset and angle are kept) without the step at its start.
Why the step: v6.8's prm has a0 = 0.021 (the start speed, at the solver's floor) and b0 = -4.48 (a large backward
second derivative), so the quintic leaves q's exit at almost no speed, runs backwards about 2.5 fu (two near-cusps,
curvature up to about 5 /fu) and only then turns forward; the census's tail piece (FN.conn_beziers) starts with that
knot, which is the dk 10.6 /u it reads at the exit seam.
The fit: Nelder-Mead from several starts on: the Hausdorff distance (fu) between the candidate and v6.8's visible tail
(q's exit point plus v6.8's samples at t >= 0.25, past the backtrack) + 0.5 x their mean distance, with penalties
that rule out a0 < 0.15, a direction outside [exit angle - 15, end angle + 15] deg anywhere (no backtrack), a census
exit-seam dk >= 5e-4 /u (g2's limit: measured as the census does, on FN.conn_beziers) and a curvature peak above
1.5 x v6.8's visible part's.
Run from the trace dir:
  venv\Scripts\python.exe -I work34\dbg\qfit_k863k.py <bodies.json> <join_params.json> <out.json> [a0 floor = 0.15]
      [curvature cap, x v6.8's visible peak = 1.5]"""
import json
import math
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
from scipy.optimize import minimize  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402
import k886lib as L  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
import census_k863k as C  # noqa: E402

U = 0.24


def curve(c, n=1200, t0=0.0):
    t = np.linspace(t0, 1.0, n)
    P = np.stack([sum(ci[d] * t ** i for i, ci in enumerate(c)) for d in (0, 1)], 1)
    D1 = np.stack([sum(i * ci[d] * t ** (i - 1) for i, ci in enumerate(c) if i >= 1) for d in (0, 1)], 1)
    D2 = np.stack([sum(i * (i - 1) * ci[d] * t ** (i - 2) for i, ci in enumerate(c) if i >= 2) for d in (0, 1)], 1)
    sp = np.linalg.norm(D1, axis=1)
    k = (D1[:, 0] * D2[:, 1] - D1[:, 1] * D2[:, 0]) / np.maximum(sp, 1e-12) ** 3
    ang = np.degrees(np.arctan2(D1[:, 1], D1[:, 0]))
    return t, P, sp, k, ang


def main():
    B = json.load(open(sys.argv[1]))
    P = json.load(open(sys.argv[2]))
    out = sys.argv[3]
    a0min = float(sys.argv[4]) if len(sys.argv) > 4 else 0.15
    kfac = float(sys.argv[5]) if len(sys.argv) > 5 else 1.5
    q = P["tail_letter"]["q"]
    prm0 = [float(v) for v in q["prm"]]
    fx = L.frame_at(B["q"]["exit"], 0.0)
    fT = L.tail_frame(fx, q["offset"], q["angle"])
    th0 = math.degrees(math.atan2(fx[1][1], fx[1][0]))
    th1 = float(q["angle"])
    body = B["q"]["strokes"][-1]["beziers"]
    c0 = L.connector(fx, fT, prm0)
    _, P0, _, k0s, _ = curve(c0, 2000)
    t0s = np.linspace(0, 1, 2000)
    vis = t0s >= 0.25
    ref = np.vstack([np.asarray(fx[0], float)[None, :], P0[vis]])
    kref = float(np.abs(k0s[vis]).max())
    tree_ref = cKDTree(ref)

    def numbers(prm):
        c = L.connector(fx, fT, prm)
        t, Pc, sp, k, ang = curve(c, 1200)
        dA = cKDTree(Pc).query(ref)[0]
        dB = tree_ref.query(Pc)[0]
        sm = C.seam(FN.conn_beziers(c), body, False, True)
        s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(Pc, axis=0), axis=1))])
        return dict(haus=float(max(dA.max(), dB.max())), mean=float(0.5 * (dA.mean() + dB.mean())),
                    ang_min=float(ang.min()), ang_max=float(ang.max()), kmax=float(np.abs(k).max()),
                    k_first8=float(np.abs(k[s <= 8.0]).max()), sp_min=float(sp.min()), len=float(s[-1]),
                    seam=sm)

    def cost(x):
        a0, a1, b0, b1 = x
        if a0 <= 0.01 or a1 <= 0.01:
            return 1e6
        n = numbers(list(x))
        pen = 0.0
        pen += 200.0 * max(0.0, a0min - a0)
        pen += 5.0 * max(0.0, (th0 - 15.0) - n["ang_min"]) + 5.0 * max(0.0, n["ang_max"] - (th1 + 15.0))
        pen += 1e4 * max(0.0, n["seam"]["dk_u"] - 4e-4)
        pen += 500.0 * max(0.0, n["kmax"] - kfac * kref)
        return n["haus"] + 0.5 * n["mean"] + pen

    starts = [[0.3, prm0[1], 0.0, prm0[3]], [0.5, prm0[1], -1.0, prm0[3]], [0.8, 1.2, 0.0, 0.0], [1.0, 1.0, 0.0, 0.0],
              [0.2, prm0[1], -2.0, prm0[3]], [0.6, 1.6, 0.5, -1.0]]
    best = None
    for s0 in starts:
        r = minimize(cost, np.asarray(s0, float), method="Nelder-Mead",
                     options=dict(maxiter=1500, xatol=1e-5, fatol=1e-5))
        if best is None or r.fun < best.fun:
            best = r
        print(f"start {s0} -> prm {[round(float(v), 5) for v in r.x]} cost {r.fun:.4f}")
    prm = [float(v) for v in best.x]
    n_new, n_old = numbers(prm), numbers(prm0)
    lines = [f"K863 J3k: q's word-end tail refit (a0 >= {a0min}, |k| <= {kfac} x v6.8's visible peak; end frame kept: offset {q['offset']}, angle {th1:.2f} deg; exit angle "
             f"{th0:.2f} deg, exit k {fx[2]:.5f} /fu)"]
    for nm, pr, n in (("v6.8", prm0, n_old), ("Q1", prm, n_new)):
        lines.append(f"  {nm}: prm [{', '.join(f'{v:.5f}' for v in pr)}]; vs v6.8's visible tail: Hausdorff "
                     f"{n['haus']:.2f} fu = {n['haus'] * U:.2f} u, mean {n['mean']:.2f} fu = {n['mean'] * U:.2f} u; "
                     f"direction {n['ang_min']:.1f}..{n['ang_max']:.1f} deg; |k| max {n['kmax']:.4f} /fu "
                     f"({n['k_first8']:.4f} in the first 8 fu); min speed {n['sp_min']:.2f}; length {n['len']:.1f} fu "
                     f"= {n['len'] * U:.2f} u; census exit seam: gap {n['seam']['gap_u']:.2e} u, angle "
                     f"{n['seam']['ang_deg']:.3g} deg, dk {n['seam']['dk_u']:.3g} /u")
    lines.append(f"  v6.8's visible part (t >= 0.25): |k| max {kref:.4f} /fu")
    print("\n".join(lines))
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(dict(prm=prm, prm_v68=prm0, new=n_new, old=n_old, text=lines), fh, indent=1)


if __name__ == "__main__":
    main()
