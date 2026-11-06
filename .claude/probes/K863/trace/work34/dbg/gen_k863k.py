r"""K863 J3k: gen_k1027 (J3d's, work27/dbg, untouched) plus the word-end forms and dots a join_params file names under
"k863k"; without that key every output is gen_k1027's, object for object (checked by checks_k863k.ps1's census of
v6.8 through this module, compared row by row with the gen_k1027 run).

"k863k": {
  "fin": {X: {"stroke": 0, "cut": [k, t], "end": [x, y], "angle": deg, "k": 1/fu, "prm": [a0, a1, b0, b1]}},
  "dot": {X: {"stroke": 1, "c": [x, y], "a": [ax, ay], "b": [bx, by], "start": deg}}
}
fin: the word's LAST letter X (a letter with no tail of its own): its stroke is cut at cubic k (counted from the
stroke's end when negative: a port entry may trim the stroke's start) and parameter t, and a tail runs from the cut's
frame (point, tangent, curvature: G2 by construction) to the end frame (end: body-local fu, so the letter's origin
is added; level-relative angle; curvature k) as the G2 connector quintic with set prm. It is appended to the word's
tails (ch = X), so the census measures it as a tail (its seam with the cut stroke, its hooks, rough, and its distance
to the shaped glyph's skeleton).
dot: every X's dot stroke is replaced by a closed loop, the ellipse c + a cos u + b sin u (c body-local), as four
cubics (the affine image of the 4-arc circle: curvature continuous at the joins), from u = start (deg).
The forms apply after gen_k1027.assemble, to the letter's placed strokes: joins and leads are solved and drawn exactly
as v6.8's (the join solver still sees the body's own dot and full stroke), so a form moves only its letter's pieces.
A sheared letter (K926's final e) takes no form (the forms here are for s, p, i, j, which are never sheared)."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import gen_k1027 as G27  # noqa: E402
from gen_k1027 import G0, L, LOG, load_ports, sidecar, tail_end  # noqa: E402,F401  (the sheet and census use these)


def ellipse_loop(c, a, b, start_deg=0.0):
    """The closed ellipse c + a cos u + b sin u from u = start, as 4 cubics (kappa = 4/3 tan(pi/8))."""
    c, a, b = (np.asarray(v, float) for v in (c, a, b))
    kap = 4.0 / 3.0 * math.tan(math.pi / 8.0)
    u0 = math.radians(start_deg)
    out = []
    for q in range(4):
        u1, u2 = u0 + q * math.pi / 2.0, u0 + (q + 1) * math.pi / 2.0
        p0 = c + a * math.cos(u1) + b * math.sin(u1)
        p3 = c + a * math.cos(u2) + b * math.sin(u2)
        d0 = -a * math.sin(u1) + b * math.cos(u1)
        d3 = -a * math.sin(u2) + b * math.cos(u2)
        out.append([p0, p0 + kap * d0, p3 - kap * d3, p3])
    out[-1][3] = out[0][0]      # closed exactly
    return [[[float(v) for v in p] for p in bz] for bz in out]


def fin_tail(bz, f, x0):
    """(cut stroke, tail dict) for a fin form f on the placed stroke bz of a letter whose origin is x0."""
    k = int(f["cut"][0])
    if k < 0:
        k += len(bz)
    t = float(f["cut"][1])
    p, Tn, kk = L.bez_frame(bz[k], t)
    cut = L.sub_path(bz, 0, 0.0, k, t)
    fx = (np.asarray(p, float), np.asarray(Tn, float), float(kk))
    th = math.radians(float(f["angle"]))
    fT = (np.asarray(f["end"], float) + np.array([x0, 0.0]), np.array([math.cos(th), math.sin(th)]),
          float(f.get("k", 0.0)))
    c = L.connector(fx, fT, tuple(float(v) for v in f["prm"]))
    return cut, dict(ch=None, coeffs=c, gen=L.sample_c(c, 200), fX=fx, fT=fT, form="k863k fin")


def assemble(font, B, P, text, with_ref=True, B_ref=None, ports=None):
    A = G27.assemble(font, B, P, text, with_ref=with_ref, B_ref=B_ref, ports=ports)
    F = P.get("k863k")
    if not F:
        return A
    fins, dots = F.get("fin", {}), F.get("dot", {})
    letters = []
    for lt in A["letters"]:
        X = lt["ch"]
        if X in dots or (X in fins and lt["last"]):
            if lt["sheared"]:
                raise ValueError(f"k863k: a form for the sheared {X} in {text!r}")
            lt = dict(lt)
            lt["strokes"] = list(lt["strokes"])
            if X in dots:
                d = dots[X]
                si = int(d.get("stroke", 1))
                lt["strokes"][si] = ellipse_loop(np.asarray(d["c"], float) + np.array([lt["x"], 0.0]), d["a"], d["b"],
                                                 float(d.get("start", 0.0)))
            if X in fins and lt["last"]:
                if tail_end(B, P, X, lt["x"]) is not None:
                    raise ValueError(f"k863k: a fin form for {X}, which has a tail of its own")
                f = fins[X]
                si = int(f.get("stroke", 0))
                lt["strokes"][si], tl = fin_tail(lt["strokes"][si], f, lt["x"])
                tl["ch"] = X
                A["tails"].append(tl)
        letters.append(lt)
    A["letters"] = letters
    return A
