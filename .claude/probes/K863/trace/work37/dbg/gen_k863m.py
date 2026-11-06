r"""K863 J3m: gen_k863k (J3k/J3l's, work34/dbg, untouched) plus the J3m forms a join_params file names under "k863m";
without that key every output is gen_k863k's, object for object.

"k863m": {
  "fin": {X: {"stroke": 0, "cut": [k, t], "retrace": RETRACE, "start": START, "end": [x, y], "angle": deg,
              "k": 1/fu, "ymin": y (optional), "prm": [a0, a1, b0, b1] (optional)}},
  "exit": {X: {"low_entry": "ehkrs", "high": {"cut": [k, t], "start": START},
               "low": {"cut": [k, t], "retrace": RETRACE}}}
}
RETRACE {"cubic": k, "u": len}: after the cut the stroke runs back along its own cubic k (from that cubic's end; k
counted from the stroke's end when negative) for len u, exactly on the letter's own centreline (under its ink), and the
piece after it leaves there G2 with it (the frame reversed): it follows the letter's curve that far and parts there.
START (the first frame of what follows the cut): absent = the cut's own frame (G2); {"angle": deg, "k": 1/fu} = a
corner, leaving at that level-relative angle and curvature (a cusp that turns out instead of back);
{"rev": deg, "k": 1/fu} = the stroke's own direction reversed and turned by deg (counterclockwise +): a near-reversal,
so the two sides of the cusp lie close and fuse into a spur.
fin: the word's LAST letter X (no tail of its own): gen_k863k's fin form (the cut, then a G2 quintic tail to the end
frame, appended to the word's tails, ch = X) with RETRACE and START. Without prm the tail's prm is fitted at build
time: the fairest (least integral of (dk/ds)^2 times length cubed), a0, a1 in [0.15, 3], no more curvature sign
changes than its two end frames force, and with ymin its lowest point held at ymin. The fit is a rule, not data; it
is cached on disk (work37/cache_k863m.json, keyed by the two frames) only for speed.
exit: every PRESET join (a solved port join is left alone) out of X, by the next letter's entry class: a next letter
in low_entry (its join goes down before it climbs) takes "low", any other "high". X's stroke is cut (and retraced) as
the form says, and the join becomes the fairest G2 quintic (the same fit) from there to the join's own entry frame,
which is unchanged: the next letter and every other piece stay J3L's. A sheared letter or a ligature's letter keeps
J3L's pieces (none of b, v, w is ever sheared)."""
import atexit
import json
import math
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_T = os.path.dirname(os.path.dirname(_HERE))
sys.path.insert(0, _HERE)
for _p in (os.path.join(_T, "work34", "dbg"), os.path.join(_T, "work27", "dbg"), os.path.join(_T, "tools")):
    if _p not in sys.path:
        sys.path.append(_p)
import numpy as np  # noqa: E402
from scipy.optimize import minimize  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402
import gen_k863k as GK  # noqa: E402
from gen_k863k import ellipse_loop, fin_cut  # noqa: E402,F401
from gen_k1027 import G0, L, LOG, load_ports, sidecar, tail_end  # noqa: E402,F401  (the sheet and census use these)

G27 = GK.G27
U = 0.24
CACHE_P = os.path.join(_T, "work37", "cache_k863m.json")
try:
    with open(CACHE_P, encoding="utf-8") as _fh:
        _CACHE = json.load(_fh)
except (OSError, ValueError):
    _CACHE = {}
_NEW = {}


def _save():
    if not _NEW:
        return
    try:
        with open(CACHE_P, encoding="utf-8") as fh:
            disk = json.load(fh)
    except (OSError, ValueError):
        disk = {}
    disk.update(_NEW)
    tmp = f"{CACHE_P}.{os.getpid()}.tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(disk, fh)
    os.replace(tmp, CACHE_P)


atexit.register(_save)


def curve(c, n=300):
    t = np.linspace(0.0, 1.0, n)
    P = np.stack([sum(ci[d] * t ** i for i, ci in enumerate(c)) for d in (0, 1)], 1)
    D1 = np.stack([sum(i * ci[d] * t ** (i - 1) for i, ci in enumerate(c) if i >= 1) for d in (0, 1)], 1)
    D2 = np.stack([sum(i * (i - 1) * ci[d] * t ** (i - 2) for i, ci in enumerate(c) if i >= 2) for d in (0, 1)], 1)
    sp = np.linalg.norm(D1, axis=1)
    k = (D1[:, 0] * D2[:, 1] - D1[:, 1] * D2[:, 0]) / np.maximum(sp, 1e-12) ** 3
    s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    return P, sp, k, s


def _key(fx, fT, ymin):
    v = [*fx[0], *fx[1], fx[2] * 1e3, *fT[0], *fT[1], fT[2] * 1e3, -1e9 if ymin is None else ymin]
    return ",".join(f"{float(a):.5f}" for a in v)


def fit_prm(fx, fT, ymin=None, n=300):
    """The fairest connector prm from frame fx to frame fT (module docstring)."""
    key = _key(fx, fT, ymin)
    if key in _CACHE:
        return [float(v) for v in _CACHE[key]]
    max_sc = int(fx[2] < -1e-6) + int(fT[2] < -1e-6)

    def cost(x):
        a0, a1, b0, b1 = x
        if a0 <= 0.05 or a1 <= 0.05:
            return 1e9
        c = L.connector(fx, fT, tuple(float(v) for v in x))
        P, sp, k, s = curve(c, n)
        dk = np.diff(k)
        ds = np.maximum(np.diff(s), 1e-9)
        S = s[-1]
        E = float(np.sum(dk * dk / ds)) * S ** 3
        pen = 1e4 * (max(0.0, 0.15 - a0) + max(0.0, 0.15 - a1) + max(0.0, a0 - 3.0) + max(0.0, a1 - 3.0))
        kk = k[3:-3]
        sg = np.sign(kk[np.abs(kk) > 1e-6])
        sc = int(np.sum(sg[1:] != sg[:-1])) if len(sg) > 1 else 0
        pen += 1e3 * max(0, sc - max_sc)
        if sp.min() < 0.02 * S:
            pen += 1e4
        if ymin is not None:
            pen += 1e2 * ((float(P[:, 1].min()) - ymin) / 10.0) ** 2
        return E + pen

    best = None
    for s0 in ([0.5, 0.5, 0.0, 0.0], [0.8, 0.8, 0.0, 0.0], [1.0, 1.0, 0.0, 0.0], [0.4, 1.0, 0.5, -0.5],
               [1.2, 0.6, -0.5, 0.5], [1.5, 1.5, 0.0, 0.0]):
        r = minimize(cost, np.asarray(s0, float), method="Nelder-Mead",
                     options=dict(maxiter=2500, xatol=1e-5, fatol=1e-7))
        if best is None or r.fun < best.fun:
            best = r
    prm = [float(v) for v in best.x]
    _CACHE[key] = _NEW[key] = prm
    return prm


def _t_back(b, length):
    """The t on cubic b whose arc length to the cubic's end is length (fu)."""
    ts = np.linspace(0.0, 1.0, 2001)
    P = np.array([L.bez_pt(b, float(t)) for t in ts])
    s = np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    back = s[-1] - s
    if length >= s[-1]:
        raise ValueError(f"k863m: a retrace of {length:.1f} fu is longer than its cubic ({s[-1]:.1f} fu)")
    return float(np.interp(-length, -back, ts))


def cut_start(bz, f):
    """(the stroke cut and retraced, the first frame after it, its kind) for a form f on the placed stroke bz."""
    k = int(f["cut"][0])
    k = k + len(bz) if k < 0 else k
    t = float(f["cut"][1])
    p, Tn, kk = L.bez_frame(bz[k], t)
    cut = L.sub_path(bz, 0, 0.0, k, t)
    p, Tn, kk = np.asarray(p, float), np.asarray(Tn, float), float(kk)
    kind = "g2"
    if "retrace" in f:
        r = f["retrace"]
        kc = int(r["cubic"])
        kc = kc + len(bz) if kc < 0 else kc
        if float(np.linalg.norm(np.asarray(bz[kc][3], float) - p)) > 0.5:
            raise ValueError("k863m: a retrace's cubic does not end at the cut")
        tp = _t_back(bz[kc], float(r["u"]) / U)
        piece = L.sub_path(bz, kc, tp, kc, 1.0)
        cut = list(cut) + [list(reversed(b)) for b in reversed(piece)]
        pp, Tp, kp = L.bez_frame(bz[kc], tp)
        p, Tn, kk = np.asarray(pp, float), -np.asarray(Tp, float), -float(kp)
        kind = "retrace"
    st = f.get("start")
    if st is not None:
        if "angle" in st:
            th = math.radians(float(st["angle"]))
            kind = "corner"
        else:
            th = math.atan2(-Tn[1], -Tn[0]) + math.radians(float(st["rev"]))
            kind = "spur"
        Tn = np.array([math.cos(th), math.sin(th)])
        kk = float(st.get("k", 0.0))
    return cut, (p, Tn, kk), kind


def fin_tail(bz, f, x0):
    cut, fx, kind = cut_start(bz, f)
    th = math.radians(float(f["angle"]))
    fT = (np.asarray(f["end"], float) + np.array([x0, 0.0]), np.array([math.cos(th), math.sin(th)]),
          float(f.get("k", 0.0)))
    if "prm" in f:
        prm = [float(v) for v in f["prm"]]
    else:
        prm = fit_prm(fx, fT, None if f.get("ymin") is None else float(f["ymin"]))
    c = L.connector(fx, fT, tuple(prm))
    return cut, dict(ch=None, coeffs=c, gen=L.sample_c(c, 200), fX=fx, fT=fT, form="k863m fin", start=kind,
                     prm=prm)


def assemble(font, B, P, text, with_ref=True, B_ref=None, ports=None):
    A = GK.assemble(font, B, P, text, with_ref=with_ref, B_ref=B_ref, ports=ports)
    F = P.get("k863m")
    if not F:
        return A
    fins, exits = F.get("fin", {}), F.get("exit", {})
    letters, by_i = [], {}
    for lt in A["letters"]:
        X = lt["ch"]
        own = str(A["shaping"][lt["i"]].get("name", "")).split(".")[0] == X
        if own and not lt["sheared"] and (X in exits or (X in fins and lt["last"])):
            lt = dict(lt)
            lt["strokes"] = list(lt["strokes"])
            by_i[lt["i"]] = lt
            if X in fins and lt["last"]:
                if tail_end(B, P, X, lt["x"]) is not None:
                    raise ValueError(f"k863m: a fin form for {X}, which has a tail of its own")
                if X in P.get("k863k", {}).get("fin", {}):
                    raise ValueError(f"k863m: {X} has a k863k fin too")
                f = fins[X]
                si = int(f.get("stroke", 0))
                lt["strokes"][si], tl = fin_tail(lt["strokes"][si], f, lt["x"])
                tl["ch"] = X
                A["tails"].append(tl)
        letters.append(lt)
    A["letters"] = letters
    for j in A["joins"]:
        if "port" in j or j["L"] not in exits or j["iL"] not in by_i:
            continue
        lt = by_i[j["iL"]]
        e = exits[j["L"]]
        cls = "low" if j["R"] in e.get("low_entry", "") else "high"
        f = e[cls]
        si = int(f.get("stroke", 0))
        lt["strokes"][si], fx, kind = cut_start(lt["strokes"][si], f)
        fR = j["fR"]
        prm = fit_prm(fx, fR)
        c = L.connector(fx, fR, tuple(prm))
        Gs = L.sample_c(c, 240)
        j.update(coeffs=c, gen=Gs, fL=fx, prm=tuple(prm), src=f"k863m exit {cls}", k863m=dict(cls=cls, start=kind))
        if j.get("ref") is not None:
            ref = np.asarray(j["ref"], float)
            j["dist_u"] = j["dist_join_u"] = G27.hd(Gs, cKDTree(ref), ref) / L.UNIT
    return A
