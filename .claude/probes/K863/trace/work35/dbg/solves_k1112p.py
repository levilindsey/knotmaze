# K1112 Run P: copy of work29/dbg/solves_k1113.py (J3f's, untouched) by work35/dbg/mk_tools_k1112p.py:
# builds are named <dir>@<ports>@<variant> on the command line (its BUILDS fallback). J3f's header:
# K1113 (J3f): copy of work28/dbg/solves_k990e.py (untouched) with the K1113 builds and the "less down, more out"
# measures; preset joins are measured too (their solve columns read "-").
r"""K1113 (J3f, v6.9) the joins of a list of pairs under several builds. Solved joins: status (0 converged, 1 maxfev),
nfev, crossings against the allowance, the right letter's attach in its stretch ('BOUND' on lo or hi of a stretch with
width), the exit's attach, kmax, the side margin, K948's meet turn. Every join (solved or preset) also gets the measures
of Levi's call (2026-11-02, b/v/w "less down and more out"), in u, y up, in the pair's frame:
  ex   the join's tangent where it leaves the body (deg; 0 = straight out, negative = down)
  top  the body's top point: the highest point of the left letter's last stroke within its last 40 u before the attach
  drop top - the lowest point of the stroke from the top point through the join's first 15 u (how far it falls
       before it turns up or out); dx = how far right of the top point that lowest point sits
Run from the trace dir:
  venv\Scripts\python.exe -I work29\dbg\solves_k1113.py <out.txt> <out.json> <pairs,comma> [v6.8,A,F,H,S,v6.9]
"""
import json
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import gen_k1027 as G  # noqa: E402
from k863lib import Font  # noqa: E402
import fewnode_k930 as FN  # noqa: E402

S = 0.24
PJ = "work29/ports_k1113.json"
BUILDS = {"v6.8": ("work28/base", PJ, "M"), "v6.9": ("work29/base", PJ, "N")}
for _v in "AFHS":
    BUILDS[_v] = ("work29/try_%s/base" % _v, PJ, "N")
    BUILDS[_v + "Q"] = ("work29/try_%s/base" % _v, PJ, "Q")   # + a's and q's after_high records (after bvw)
for _v in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    BUILDS.setdefault("try_" + _v, ("work29/try_%s/base" % _v, PJ, "N"))


def _pts(bzs, n=60):
    out = []
    for b in bzs:
        b = np.asarray(b, float)
        t = np.linspace(0, 1, n)[:, None]
        out.append(((1 - t) ** 3) * b[0] + 3 * ((1 - t) ** 2) * t * b[1] + 3 * (1 - t) * t * t * b[2] + (t ** 3) * b[3])
    return np.vstack(out) * S


def _arc(P):
    return np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]


def meet_turn(A, j, span_u=1.0, win_u=4.0):
    J = _pts(FN.conn_beziers(j["coeffs"]))
    L = _pts(A["letters"][1]["strokes"][0])
    m = int(np.argmin(np.linalg.norm(L - J[-1], axis=1)))
    gap = float(np.linalg.norm(L[m] - J[-1]))
    P = np.vstack([J, L[m + 1:]])
    d = np.diff(P, axis=0)
    d = d[np.linalg.norm(d, axis=1) > 1e-9]
    s = np.r_[0.0, np.cumsum(np.linalg.norm(d, axis=1))][:-1]
    ang = np.unwrap(np.arctan2(d[:, 1], d[:, 0]))
    sm = float(np.sum(np.linalg.norm(np.diff(J, axis=0), axis=1)))
    worst = 0.0
    for i in np.nonzero(np.abs(s - sm) <= win_u)[0]:
        k = int(np.searchsorted(s, s[i] + span_u))
        if k < len(s):
            worst = max(worst, float(np.degrees(np.abs(ang[i:k + 1] - ang[i]).max())))
    tj = J[-1] - J[-4]
    tl = L[min(m + 3, len(L) - 1)] - L[m]
    a = float(np.degrees(np.arccos(np.clip(tj @ tl / (np.linalg.norm(tj) * np.linalg.norm(tl) + 1e-12), -1, 1))))
    return worst, a, gap


def out_measures(A, j, win_u=40.0, first_u=15.0):
    J = _pts(FN.conn_beziers(j["coeffs"]))
    L0 = _pts(A["letters"][0]["strokes"][-1])
    m = int(np.argmin(np.linalg.norm(L0 - J[0], axis=1)))
    sL = _arc(L0[:m + 1])
    w = np.nonzero(sL >= sL[-1] - win_u)[0]
    t = int(w[np.argmax(L0[w, 1])])
    sJ = _arc(J)
    k = int(np.searchsorted(sJ, first_u))
    P = np.vstack([L0[t:m + 1], J[:max(k, 2)]])
    i = int(np.argmin(P[:, 1]))
    d = J[3] - J[0]
    ex = float(np.degrees(np.arctan2(d[1], d[0])))
    return dict(ex=ex, top=[float(L0[t, 0]), float(L0[t, 1])], attach=[float(J[0, 0]), float(J[0, 1])],
                drop=float(L0[t, 1] - P[i, 1]), dx=float(P[i, 0] - L0[t, 0]), body_drop=float(L0[t, 1] - J[0, 1]))


def main():
    out_txt, out_json, pairs = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
    names = sys.argv[4].split(",") if len(sys.argv) > 4 else ["v6.8", "A", "F", "H", "S"]
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    res, lines = {}, []
    lines.append(f"{'pair':5s} {'build':6s} {'st':>2s} {'nfev':>5s} {'cross':>7s} {'entry':7s} {'attach s_u in [lo,hi]':>26s} "
                 f"{'exit':>5s} {'kmax':>6s} {'side':>7s} {'ymin':>7s} {'turn':>5s} | {'ex':>6s} {'drop':>5s} {'dx':>5s} "
                 f"{'bdrop':>5s}  note")
    for nm in names:
        d, pp, var = BUILDS[nm] if nm in BUILDS else nm.split("@")   # or <build dir>@<ports json>@<variant>
        B = json.load(open(os.path.join(T, d, "bodies.json")))
        P = json.load(open(os.path.join(T, d, "join_params.json")))
        ports = G.load_ports(os.path.join(T, pp), var)
        for pr in pairs:
            A = G.assemble(font, B, P, pr, with_ref=False, B_ref=B, ports=ports)
            if not A["joins"]:
                continue
            j = A["joins"][0]
            om = out_measures(A, j)
            r = dict(pair=pr, build=nm, solved="port" in j, cls=j.get("cls"), **om)
            note = []
            if "port" in j:
                po, s = j["port"], j["port"]["solve"]
                lo, hi = s["stretch_solved_u"]
                sa = po["entry"]["s_u"]
                if hi - lo > 0.01 and (abs(sa - lo) < 0.05 or abs(sa - hi) < 0.05):
                    note.append("BOUND")
                if s["status"] != 0:
                    note.append("MAXFEV")
                if s["crossings"] > s["crossings_allowed"]:
                    note.append("CROSS+")
                r.update(status=s["status"], nfev=s["nfev"], cross=s["crossings"], allowed=s["crossings_allowed"],
                         entry_kind=po["entry"]["kind"], s_u=sa, lo=lo, hi=hi, exit_from_end=po["exit"]["from_end_u"],
                         kmax=s["kmax_u"], side_min=s["side_min_u"], ymin=s["ymin_u"], J=s["J"])
                r["meet_turn"], r["meet_angle"], r["meet_gap"] = meet_turn(A, j)
                f = lambda v, fm: ("-" if v is None else format(v, fm))
                head = (f"{pr:5s} {nm:6s} {s['status']:2d} {s['nfev']:5d} {s['crossings']:3d}/{s['crossings_allowed']:<3d} "
                        f"{po['entry']['kind']:7s} {sa:8.2f} in [{lo:7.2f},{hi:7.2f}] {po['exit']['from_end_u']:5.2f} "
                        f"{s['kmax_u']:6.3f} {f(s['side_min_u'], '7.3f'):>7s} {s['ymin_u']:7.2f} {r['meet_turn']:5.1f}")
            else:
                head = f"{pr:5s} {nm:6s} {'preset ' + str(j.get('cls')):>78s}"
            r["note"] = note
            res[f"{pr}|{nm}"] = r
            lines.append(head + f" | {om['ex']:6.1f} {om['drop']:5.1f} {om['dx']:5.1f} {om['body_drop']:5.1f}  {' '.join(note)}")
    open(out_txt, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    json.dump(res, open(out_json, "w"), indent=1, default=lambda o: np.asarray(o).tolist())
    print("\n".join(lines))


if __name__ == "__main__":
    main()