r"""K863 J3l: word-end tails as J3k's fin forms (gen_k863k's "k863k".fin, unchanged): the letter's stroke cut at
(k, t) (s, p: the bowl's bottom, where v6.8's retrace of the closing curl ends; b, o, v, w, f: the stroke's end),
and a G2 quintic from the cut's frame (point, tangent, curvature) to an end frame set here: the end point as an
offset (fu) from the cut point, a level-relative angle, curvature 0. The tail's prm (a0, a1, b0, b1) is the
fairest one: the least integral of (dk/ds)^2 along the tail (times its length cubed: scale-free), with penalties
that keep a0, a1 in [0.15, 3], the turning one way where the spec says so ("turn": +1 left, -1 right, 0 either:
one sign change allowed), and the tail off the letter's own stroke past its first "skip" fu (a margin in fu).
Run from the trace dir:
  venv\Scripts\python.exe -I work36\dbg\fit_k863l.py <build dir> <ports.json> <variant> <spec.json> <out forms.json>
spec.json: {X: {"word": w, "stroke": 0, "cut": [k, t], "d": [dx, dy], "angle": deg, "turn": 1, "clear": [skip, margin]}}
The out file holds {"fin": {X: form}}; the report goes to stdout."""
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
import gen_k863k as G  # noqa: E402
from k863lib import Font  # noqa: E402

U = 0.24


def curve(c, n=900):
    t = np.linspace(0.0, 1.0, n)
    P = np.stack([sum(ci[d] * t ** i for i, ci in enumerate(c)) for d in (0, 1)], 1)
    D1 = np.stack([sum(i * ci[d] * t ** (i - 1) for i, ci in enumerate(c) if i >= 1) for d in (0, 1)], 1)
    D2 = np.stack([sum(i * (i - 1) * ci[d] * t ** (i - 2) for i, ci in enumerate(c) if i >= 2) for d in (0, 1)], 1)
    sp = np.linalg.norm(D1, axis=1)
    k = (D1[:, 0] * D2[:, 1] - D1[:, 1] * D2[:, 0]) / np.maximum(sp, 1e-12) ** 3
    ang = np.unwrap(np.arctan2(D1[:, 1], D1[:, 0]))
    s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    return P, sp, k, np.degrees(ang), s


def bez_pts(b, n=60):
    b = np.asarray(b, float)
    t = np.linspace(0.0, 1.0, n)[:, None]
    return ((1 - t) ** 3) * b[0] + 3 * ((1 - t) ** 2) * t * b[1] + 3 * (1 - t) * t * t * b[2] + t ** 3 * b[3]


def curve_k(P):
    d1 = np.gradient(P, axis=0)
    d2 = np.gradient(d1, axis=0)
    return (d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / np.maximum(np.linalg.norm(d1, axis=1) ** 3, 1e-12)


def ideal(fx, prof, ds=0.5):
    """The curve whose curvature runs piecewise-linearly through prof's knots [(s fu, k /u), ...] (the first knot's
    k is the cut's own), from the cut frame fx: points, end point, end direction (rad), end curvature (/fu)."""
    s_k = np.array([float(a) for a, _ in prof])
    k_k = np.array([float(fx[2])] + [float(b) * U for _, b in prof[1:]])
    n = int(s_k[-1] / ds) + 1
    s = np.linspace(0.0, s_k[-1], n)
    k = np.interp(s, s_k, k_k)
    th0 = math.atan2(fx[1][1], fx[1][0])
    th = th0 + np.concatenate([[0.0], np.cumsum(0.5 * (k[1:] + k[:-1]) * np.diff(s))])
    d = np.stack([np.cos(th), np.sin(th)], 1)
    P = np.asarray(fx[0], float) + np.concatenate([[[0.0, 0.0]], np.cumsum(0.5 * (d[1:] + d[:-1]) * np.diff(s)[:, None], 0)])
    return P, th[-1], k[-1]


def fit(fx, fT, turn, body, skip, margin, ref=None):
    tree = cKDTree(body)
    rtree = cKDTree(ref) if ref is not None else None

    def measures(prm):
        c = L.connector(fx, fT, prm)
        P, sp, k, ang, s = curve(c)
        dk = np.diff(k)
        ds = np.maximum(np.diff(s), 1e-9)
        S = s[-1]
        E = float(np.sum(dk * dk / ds)) * S ** 3
        far = s > skip
        clr = float(tree.query(P[far])[0].min()) if far.any() else 1e9
        m = dict(c=c, P=P, k=k, ang=ang, s=s, E=E, S=S, clr=clr, spmin=float(sp.min()))
        if rtree is not None:
            dA = rtree.query(P)[0]
            dB = cKDTree(P).query(ref)[0]
            m["haus"] = float(max(dA.max(), dB.max()))
            m["mean"] = float(0.5 * (dA.mean() + dB.mean()))
        return m

    def cost(x):
        a0, a1, b0, b1 = x
        if a0 <= 0.05 or a1 <= 0.05:
            return 1e9
        m = measures(list(x))
        if rtree is not None:
            m["E"] = 10.0 * m["haus"] + 10.0 * m["mean"] + 0.01 * m["E"]
        pen = 1e4 * (max(0.0, 0.15 - a0) + max(0.0, 0.15 - a1) + max(0.0, a0 - 3.0) + max(0.0, a1 - 3.0))
        k = m["k"][5:-5]
        if turn:
            pen += 1e7 * float(np.sum(np.maximum(0.0, -turn * k)) ** 2)
        else:
            sg = np.sign(k[np.abs(k) > 1e-5])
            pen += 1e3 * max(0, int(np.sum(sg[1:] != sg[:-1])) - 1)
        pen += 1e2 * max(0.0, margin - m["clr"])
        return m["E"] + pen

    best = None
    for s0 in ([0.5, 0.5, 0.0, 0.0], [0.8, 0.8, 0.0, 0.0], [1.0, 1.0, 0.0, 0.0], [0.4, 1.0, 0.5, -0.5],
               [1.2, 0.6, -0.5, 0.5], [0.6, 1.4, 0.0, -1.0], [1.5, 1.5, 0.0, 0.0]):
        r = minimize(cost, np.asarray(s0, float), method="Nelder-Mead", options=dict(maxiter=4000, xatol=1e-6, fatol=1e-6))
        if best is None or r.fun < best.fun:
            best = r
    prm = [float(v) for v in best.x]
    return prm, measures(prm), float(best.fun)


def main():
    bd, pp, var, spec_p, out_p = sys.argv[1:6]
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P = json.load(open(os.path.join(bd, "join_params.json")))
    ports = G.load_ports(pp, var)
    spec = json.load(open(spec_p))
    forms = {}
    for X, f in spec.items():
        A = G.G27.assemble(font, B, P, f["word"], with_ref=False, ports=ports)
        lt = A["letters"][-1]
        assert lt["ch"] == X, (X, f["word"])
        x0 = lt["x"]
        si = int(f.get("stroke", 0))
        bz = lt["strokes"][si]
        k = int(f["cut"][0])
        k = k + len(bz) if k < 0 else k
        t = float(f["cut"][1])
        p, Tn, kk = L.bez_frame(bz[k], t)
        fx = (np.asarray(p, float), np.asarray(Tn, float), float(kk))
        ref = None
        if "hug" in f:
            # ride back along the letter's own cubic (reversed, from the cut) to its parameter tp, then a curve whose
            # curvature falls linearly from the cubic's there to 0 over "taper" fu: the tail leaves the bowl it passes
            hb = bz[int(f["hug"]["cubic"]) + (len(bz) if int(f["hug"]["cubic"]) < 0 else 0)]
            tp = float(f["hug"]["tp"])
            ts = np.linspace(1.0, tp, 200)
            H = np.vstack([bez_pts(hb, 2)[:0]] + [L.bez_frame(hb, float(tt))[0][None, :] for tt in ts])
            pp_, Tp, kp = L.bez_frame(hb, tp)
            fp = (np.asarray(pp_, float), -np.asarray(Tp, float), -float(kp))
            hprof = f["hug"].get("prof") or [[0, 0], [float(f["hug"]["taper"]), 0.0]]
            R2, th_e, k_e = ideal(fp, hprof)
            ref = np.vstack([H, R2[1:]])
            end = ref[-1]
            f["angle"] = round(math.degrees(th_e), 4)
            f["k"] = 0.0
            f["d"] = [float(v) for v in end - np.asarray(p, float)]
            print(f"   hug: leaves the cubic at t {tp} (body ({pp_[0] - x0:.1f}, {pp_[1]:.1f}), dir "
                  f"{math.degrees(math.atan2(-Tp[1], -Tp[0])):.1f} deg, k {-kp / U:.4f} /u)")
        if "wrap" in f:
            # concentric with the bowl it passes: the bowl's own cubic, reversed from the cut, pushed out along its
            # outer normal by an offset that eases in from 0 to D (smoothstep over [s0, s1] fu of the bowl), up to
            # where the bowl's direction reaches th_end; then an exit whose curvature runs through the "exit" knots
            # (the first knot's k is the offset curve's own there): the tail parts from the bowl and swoops up
            wp = f["wrap"]
            hb = bz[int(wp["cubic"]) + (len(bz) if int(wp["cubic"]) < 0 else 0)]
            ts = np.linspace(1.0, 0.0, 4001)
            fr = [L.bez_frame(hb, float(tt)) for tt in ts]
            Bp = np.array([np.asarray(a[0], float) for a in fr])
            Tg = -np.array([np.asarray(a[1], float) for a in fr])
            th = np.degrees(np.unwrap(np.arctan2(Tg[:, 1], Tg[:, 0])))
            sb = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(Bp, axis=0), axis=1))])
            ie = int(np.argmax(th >= float(wp["th_end"]))) if (th >= float(wp["th_end"])).any() else len(th) - 1
            s0, s1 = (float(v) for v in wp["ramp"])
            u_ = np.clip((sb - s0) / max(s1 - s0, 1e-9), 0.0, 1.0)
            dl = float(wp["D"]) * u_ * u_ * (3 - 2 * u_)
            Nn = np.stack([Tg[:, 1], -Tg[:, 0]], 1)
            O = (Bp + dl[:, None] * Nn)[: ie + 1]
            dO = O[-1] - O[-3]
            kO = float(curve_k(O)[-3])
            fo = (O[-1], dO / np.linalg.norm(dO), kO)
            R2, th_e, k_e = ideal(fo, wp["exit"])
            ref = np.vstack([O, R2[1:]])
            end = ref[-1]
            f["angle"] = round(math.degrees(th_e), 4)
            f["k"] = 0.0 if abs(k_e) < 1e-12 else float(k_e)
            f["d"] = [float(v) for v in end - np.asarray(p, float)]
            print(f"   wrap: the bowl to {th[ie]:.1f} deg (body ({Bp[ie][0] - x0:.1f}, {Bp[ie][1]:.1f})), offset {dl[ie]:.0f} fu "
                  f"there (body ({O[-1][0] - x0:.1f}, {O[-1][1]:.1f}), k {kO / U:.4f} /u); exit {wp['exit']}")
        if "prof" in f:
            ref, th_e, k_e = ideal(fx, f["prof"])
            end = ref[-1]
            f["angle"] = round(math.degrees(th_e), 4)
            f["k"] = 0.0 if abs(k_e) < 1e-12 else float(k_e)
            f["d"] = [float(v) for v in end - np.asarray(p, float)]
        th = math.radians(float(f["angle"]))
        end = np.asarray(p, float) + np.asarray(f["d"], float)
        fT = (end, np.array([math.cos(th), math.sin(th)]), float(f.get("k", 0.0)))
        cut = L.sub_path(bz, 0, 0.0, k, t)
        body = np.vstack([bez_pts(b) for b in cut] + [bez_pts(b) for j, s_ in enumerate(lt["strokes"]) if j != si
                                                        for b in s_])
        skip, margin = f.get("clear", [60.0, 30.0])
        bands = []
        for y0, y1 in ((0, 50), (50, 100), (100, 150), (150, 200), (200, 300), (300, 400)):
            sel = body[(body[:, 1] >= y0) & (body[:, 1] < y1)]
            if len(sel):
                bands.append(f"y {y0}-{y1}: {sel[:, 0].max() - x0:.0f}")
        print(f"{X}: the letter's right edge (body fu) " + "; ".join(bands))
        prm, m, fun = fit(fx, fT, int(f.get("turn", 1)), body, float(skip), float(margin), ref)
        if ref is not None:
            print(f"   ideal ({f.get('prof', f.get('hug', f.get('wrap')))}): end d ({f['d'][0]:.1f}, {f['d'][1]:.1f}) fu, angle {f['angle']:.1f}; "
                  f"fit Hausdorff {m['haus'] * U:.2f} u, mean {m['mean'] * U:.2f} u")
        kk_ = m["k"] / U
        ang = m["ang"]
        sg = np.sign(kk_[5:-5][np.abs(kk_[5:-5]) > 2e-4])
        print(f"{X} ({f['word']}): cut {f['cut']} at body ({p[0] - x0:.1f}, {p[1]:.1f}) dir "
              f"{math.degrees(math.atan2(Tn[1], Tn[0])):.1f} deg, k {kk / U:.4f} /u; end body ({end[0] - x0:.1f}, "
              f"{end[1]:.1f}) at {f['angle']} deg")
        print(f"   prm [{', '.join(f'{v:.4f}' for v in prm)}] cost {fun:.3f} (fairness {m['E']:.3f}); length "
              f"{m['S'] * U:.1f} u; k start {kk_[0]:.4f} min {kk_.min():.4f} max {kk_.max():.4f} end {kk_[-1]:.4f} /u; "
              f"sign changes {int(np.sum(sg[1:] != sg[:-1]))}; direction {ang.min():.1f}..{ang.max():.1f} deg; "
              f"lowest y {m['P'][:, 1].min():.1f}; clearance past {skip:.0f} fu {m['clr'] * U:.1f} u; min speed {m['spmin']:.1f}")
        # the visible tail: from where the tail's centreline last comes within a pen's width (9.2 u) of the letter's
        # own centrelines (its ink parts from the letter's there) to its end, and its gap at a few places
        dd = cKDTree(body).query(m["P"])[0]
        pen = 9.2 / U
        inside = np.nonzero(dd < pen)[0]
        i0 = int(inside[-1]) + 1 if len(inside) else 0
        vis = (m["S"] - m["s"][min(i0, len(m["s"]) - 1)]) * U
        top = m["P"][:, 1].max()
        print(f"   visible past the ink: {vis:.1f} u (parts at body ({m['P'][min(i0, len(m['P']) - 1)][0] - x0:.0f}, "
              f"{m['P'][min(i0, len(m['P']) - 1)][1]:.0f})); end height {top * U:.1f} u; gap to the letter (u) at 25/50/75/100%: "
              + " ".join(f"{dd[int(r * (len(dd) - 1))] * U:.1f}" for r in (0.25, 0.5, 0.75, 1.0)))
        q = np.linspace(0, len(m["P"]) - 1, 9).astype(int)
        print("   samples (body fu): " + " ".join(f"({m['P'][i][0] - x0:.0f},{m['P'][i][1]:.0f})" for i in q)
              + "  k /u: " + " ".join(f"{kk_[i]:.3f}" for i in q))
        forms[X] = {"stroke": si, "cut": [int(f["cut"][0]), t], "end": [float(end[0] - x0), float(end[1])],
                    "angle": float(f["angle"]), "k": float(f.get("k", 0.0)), "prm": prm}
    with open(out_p, "w", encoding="utf-8") as fh:
        json.dump({"fin": forms}, fh, indent=1)


if __name__ == "__main__":
    main()
