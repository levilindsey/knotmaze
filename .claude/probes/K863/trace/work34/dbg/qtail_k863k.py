r"""K863 J3k task 5: q's tail (join_params tail_letter.q) sampled near its start: point, direction, speed and curvature
along the quintic, for a join_params file and an optional replacement set prm (a0,a1,b0,b1).
Run from the trace dir:
  venv\Scripts\python.exe -I work34\dbg\qtail_k863k.py <bodies.json> <join_params.json> [a0,a1,b0,b1]"""
import json
import math
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
import numpy as np  # noqa: E402
import k886lib as L  # noqa: E402

B = json.load(open(sys.argv[1]))
P = json.load(open(sys.argv[2]))
q = P["tail_letter"]["q"]
prm = [float(v) for v in sys.argv[3].split(",")] if len(sys.argv) > 3 else q["prm"]
fx = L.frame_at(B["q"]["exit"], 0.0)
fT = L.tail_frame(fx, q["offset"], q["angle"])
c = L.connector(fx, fT, prm)
print(f"prm {prm}; exit dir {math.degrees(math.atan2(fx[1][1], fx[1][0])):.2f} deg, k {fx[2]:.5f}/fu; end "
      f"({fT[0][0]:.1f}, {fT[0][1]:.1f}) dir {q['angle']:.2f} deg")
for t in (0, 0.002, 0.005, 0.01, 0.02, 0.03, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0):
    p, d1, d2 = L.poly_eval(c, t)
    n = float(np.linalg.norm(d1))
    k = L.cross(d1, d2) / n ** 3 if n > 1e-9 else float("nan")
    print(f"t {t:.3f} p ({p[0]:8.2f}, {p[1]:7.2f}) dir {math.degrees(math.atan2(d1[1], d1[0])):7.1f} deg "
          f"speed {n:9.2f} k {k:9.4f}/fu = {k / 0.24:8.3f}/u")
Ps = L.sample_c(c, 4000)
s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(Ps, axis=0), axis=1))])
print(f"length {s[-1]:.1f} fu = {s[-1] * 0.24:.2f} u")
