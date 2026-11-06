r"""K863 J3k: the candidates' inputs. Writes <out dir>/<name>/join_params.json (v6.8's join_params plus the "k863k"
forms gen_k863k reads, or q's refit prm) and <out dir>/forms.txt (each form and the numbers it is built from).
  S1  s at a word's end: the stroke cut at its reversal (the end of cubic -4, where the template's bottom curl turns
      back): the curl sweeping left is the end; the retrace and the run-out along the baseline are gone.
  S2  as S1, cut where the font's stroke ends: the point of that cubic nearest the end of s.ful.fin's skeleton.
  P1  p at a word's end: the stroke cut at its reversal (the end of cubic -4, where the bowl comes back into the stem,
      as p.jmc.fin's bowl closes into its stem): the retrace and the run-out are gone.
  Q1  q's word-end tail: tail_letter.q's prm replaced by qfit_k863k.py's (the end frame is kept).
  D1  i and j: the dot stroke replaced by a closed circle at the font dot's centroid, centreline radius = the font dot's
      minor semi-axis - half the pen (the pen fills it: a round dot inscribed in the font's).
  D2  as D1, an ellipse: centreline semi-axes = the font dot's semi-axes - half the pen, along its major axis (the ink's
      outline is the font dot's ellipse).
  plus any union given as NAME=A+B+... (forms merged; for the test-word column).
The font dot: the glyph's contour above y 600 at wght 100; its centroid and semi-axes from the filled contour's area
moments (an ellipse's semi-axis = 2 sqrt(eigenvalue of the covariance)), averaged over the glyph variants the words
use, in body coordinates (glyph-local minus the variant's dx).
Run from the trace dir:
  venv\Scripts\python.exe -I work34\dbg\cand_k863k.py <v6.8 build dir> <ports.json> <variant> <qfit.json> <out dir>
      [NAME=A+B+...]"""
import copy
import json
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import k886lib as L  # noqa: E402
import gen_k863k as G  # noqa: E402
import join_k926 as J  # noqa: E402
from k863lib import Font  # noqa: E402

K = L.K
U = 0.24
PEN_U = 9.2
H = PEN_U / 2.0 / U          # half the pen, fu


def bez_pts(b, ts):
    b = np.asarray(b, float)
    t = np.asarray(ts, float)[:, None]
    return ((1 - t) ** 3) * b[0] + 3 * ((1 - t) ** 2) * t * b[1] + 3 * (1 - t) * t * t * b[2] + t ** 3 * b[3]


def area_moments(p):
    p = np.asarray(p, float)
    x, y = p[:, 0], p[:, 1]
    x1, y1 = np.roll(x, -1), np.roll(y, -1)
    cr = x * y1 - x1 * y
    A = cr.sum() / 2.0
    cx = ((x + x1) * cr).sum() / (6 * A)
    cy = ((y + y1) * cr).sum() / (6 * A)
    ixx = ((x * x + x * x1 + x1 * x1) * cr).sum() / 12.0 / A - cx * cx
    iyy = ((y * y + y * y1 + y1 * y1) * cr).sum() / 12.0 / A - cy * cy
    ixy = ((x * y1 + 2 * x * y + 2 * x1 * y1 + x1 * y) * cr).sum() / 24.0 / A - cx * cy
    w, v = np.linalg.eigh(np.array([[ixx, ixy], [ixy, iyy]]))
    return dict(c=np.array([cx, cy]), area=abs(A), semi=2.0 * np.sqrt(np.maximum(w, 0.0)), dirs=v)


def main():
    bd, pp, var, qfit, od = sys.argv[1:6]
    unions = [a.split("=", 1) for a in sys.argv[6:]]
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P = json.load(open(os.path.join(bd, "join_params.json")))
    ports = G.load_ports(pp, var)
    lines = [f"K863 J3k candidates from {bd} (ports {pp} {var}); pen {PEN_U} u, half-pen {H:.2f} fu"]
    forms = {}
    # s and p at a word's end: the reversal, and (s) the font skeleton's end
    for X, word in (("s", "as"), ("p", "ap")):
        A = G.assemble(font, B, P, word, with_ref=False, ports=ports)
        lt = A["letters"][-1]
        assert lt["ch"] == X and lt["last"] and not lt["sheared"]
        g = A["shaping"][lt["i"]]
        bz = lt["strokes"][0]
        k = len(bz) - 4
        p_rev = np.asarray(bz[k][3], float)
        _, Tn, _ = L.bez_frame(bz[k], 1.0)
        sg = J.skel_graph(font, g, origin=0.0)
        ends = sg.fu[sg.deg == 1]
        dsk = float(np.min(np.linalg.norm(sg.fu - p_rev, axis=1)))
        lines.append(f"{X} ({word!r}, glyph {g['name']}, body origin {lt['x']:.2f}): the placed stroke has {len(bz)} cubics;"
                     f" the reversal (end of cubic {k} = -4) at body ({p_rev[0] - lt['x']:.1f}, {p_rev[1]:.1f}), direction "
                     f"{np.degrees(np.arctan2(Tn[1], Tn[0])):.1f} deg, {dsk:.1f} fu from the font skeleton; skeleton ends "
                     + ", ".join(f"({e[0] - lt['x']:.1f}, {e[1]:.1f})" for e in ends) + " (body coordinates)")
        if X == "s":
            e = ends[np.argmin(np.linalg.norm(ends - p_rev, axis=1))]
            ts = np.linspace(0.0, 1.0, 4001)
            pts = bez_pts(bz[k], ts)
            i = int(np.argmin(np.linalg.norm(pts - e, axis=1)))
            t2 = float(ts[i])
            pc, Tc, _ = L.bez_frame(bz[k], t2)
            seg = bez_pts(bz[k], np.linspace(t2, 1.0, 400))
            cut_len = float(np.linalg.norm(np.diff(seg, axis=0), axis=1).sum())
            lines.append(f"  s: the skeleton end nearest the reversal is ({e[0] - lt['x']:.1f}, {e[1]:.1f}); the nearest point "
                         f"of cubic {k} is t {t2:.4f} at ({pc[0] - lt['x']:.1f}, {pc[1]:.1f}), {np.linalg.norm(pts[i] - e):.1f} "
                         f"fu from it, direction {np.degrees(np.arctan2(Tc[1], Tc[0])):.1f} deg; {cut_len:.1f} fu = "
                         f"{cut_len * U:.2f} u shorter than S1")
            forms["S1"] = {"fin": {"s": {"stroke": 0, "cut": [-4, 1.0]}}}
            forms["S2"] = {"fin": {"s": {"stroke": 0, "cut": [-4, round(t2, 4)]}}}
        else:
            forms["P1"] = {"fin": {"p": {"stroke": 0, "cut": [-4, 1.0]}}}
    # the dots
    dot_words = {"i": ["minimum", "it", "oi"], "j": ["jet", "oj"]}
    dot = {}
    for X, words in dot_words.items():
        cs, semis, dirs = [], [], []
        for w in words:
            A = G.assemble(font, B, P, w, with_ref=False, ports=ports)
            for lt in A["letters"]:
                if lt["ch"] != X:
                    continue
                g = A["shaping"][lt["i"]]
                polys = [np.asarray(p, float) for p in K.placed_polys(font, g, 100, 0.0)
                         if len(p) > 2 and np.asarray(p, float)[:, 1].min() > 600.0]
                assert len(polys) == 1, (w, X, len(polys))
                m = area_moments(polys[0])
                cs.append(m["c"] - [lt["x"], 0.0])
                semis.append(m["semi"])
                d = m["dirs"][:, 1]
                dirs.append(d if d[0] >= 0 else -d)
                lines.append(f"{X} dot ({w!r}, glyph {g['name']}, dx {lt['dx']:.2f}): font dot centroid body ("
                             f"{cs[-1][0]:.2f}, {cs[-1][1]:.2f}), area {m['area']:.0f} fu^2, semi-axes {m['semi'][1]:.1f} x "
                             f"{m['semi'][0]:.1f} fu, major axis at {np.degrees(np.arctan2(dirs[-1][1], dirs[-1][0])):.1f} deg")
        c = np.mean(cs, axis=0)
        sa, sb = float(np.mean([s[1] for s in semis])), float(np.mean([s[0] for s in semis]))
        u = np.mean(dirs, axis=0)
        u /= np.linalg.norm(u)
        v = np.array([-u[1], u[0]])
        R1 = sb - H
        A2, B2 = sa - H, sb - H
        lines.append(f"  {X}: mean centroid body ({c[0]:.2f}, {c[1]:.2f}), semi-axes {sa:.1f} x {sb:.1f} fu "
                     f"({2 * sa * U:.1f} x {2 * sb * U:.1f} u), major axis at {np.degrees(np.arctan2(u[1], u[0])):.1f} deg; "
                     f"D1 circle radius {R1:.1f} fu (ink diameter {2 * (R1 + H) * U:.1f} u, hole radius {R1 - H:.1f} fu); "
                     f"D2 ellipse {A2:.1f} x {B2:.1f} fu (ink {2 * (A2 + H) * U:.1f} x {2 * (B2 + H) * U:.1f} u)")
        dot[X] = dict(D1={"stroke": 1, "c": [round(float(c[0]), 3), round(float(c[1]), 3)], "a": [round(R1, 3), 0.0],
                          "b": [0.0, round(R1, 3)], "start": 90.0},
                      D2={"stroke": 1, "c": [round(float(c[0]), 3), round(float(c[1]), 3)],
                          "a": [round(float(A2 * u[0]), 3), round(float(A2 * u[1]), 3)],
                          "b": [round(float(B2 * v[0]), 3), round(float(B2 * v[1]), 3)], "start": 90.0})
    forms["D1"] = {"dot": {X: dot[X]["D1"] for X in dot}}
    forms["D2"] = {"dot": {X: dot[X]["D2"] for X in dot}}
    Q = json.load(open(qfit))
    lines.append(f"Q1: tail_letter.q prm {Q['prm_v68']} -> {Q['prm']} ({qfit})")
    out = {}
    for name, F in forms.items():
        Pn = copy.deepcopy(P)
        Pn["k863k"] = F
        out[name] = Pn
    Pn = copy.deepcopy(P)
    Pn["tail_letter"]["q"]["prm"] = [float(v) for v in Q["prm"]]
    out["Q1"] = Pn
    for name, parts in unions:
        Pn = copy.deepcopy(P)
        F = {}
        for part in parts.split("+"):
            src = out[part]
            for kind, d in src.get("k863k", {}).items():
                F.setdefault(kind, {}).update(d)
            if src["tail_letter"]["q"]["prm"] != P["tail_letter"]["q"]["prm"]:
                Pn["tail_letter"]["q"]["prm"] = src["tail_letter"]["q"]["prm"]
        if F:
            Pn["k863k"] = F
        out[name] = Pn
        lines.append(f"{name} = {parts}")
    for name, Pn in out.items():
        os.makedirs(os.path.join(od, name), exist_ok=True)
        with open(os.path.join(od, name, "join_params.json"), "w", encoding="utf-8") as fh:
            json.dump(Pn, fh, indent=1)
        lines.append(f"{name}: " + json.dumps(Pn.get("k863k", {})) + (
            f" q prm {Pn['tail_letter']['q']['prm']}" if Pn["tail_letter"]["q"]["prm"] != P["tail_letter"]["q"]["prm"]
            else ""))
    with open(os.path.join(od, "forms.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
