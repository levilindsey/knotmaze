r"""K863 J3k task 3: the font's i and j dots against v6.8's dot strokes (bodies.json stroke 1), in word coordinates.
Per case: the shaped glyph, its dot contour (the font fill at wght 100: the contour whose points all lie above
x-height + 100 fu), the dot's centroid, area, equivalent diameter, extents and principal half-axes (fu and u), and
v6.8's dot stroke as the build places it (its ends, length, centroid, offset from the font dot's centroid).
Run from the trace dir:
  venv\Scripts\python.exe -I work34\dbg\dots_k863k.py <build dir> <ports.json> <variant> <out.txt> <words...>"""
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
from k863lib import Font  # noqa: E402

K = L.K
U = 0.24


def poly_stats(p):
    p = np.asarray(p, float)
    x, y = p[:, 0], p[:, 1]
    x1, y1 = np.roll(x, -1), np.roll(y, -1)
    cr = x * y1 - x1 * y
    a = cr.sum() / 2.0
    cx = ((x + x1) * cr).sum() / (6 * a)
    cy = ((y + y1) * cr).sum() / (6 * a)
    q = p - [cx, cy]
    w, v = np.linalg.eigh(np.cov(q.T))
    # half-axes of the ellipse with the same area and second moments: semi-axis = 2 sqrt(eigenvalue)
    ax = 2.0 * np.sqrt(np.maximum(w, 0.0))
    return dict(c=(cx, cy), area=abs(a), d_eq=2.0 * np.sqrt(abs(a) / np.pi), ext=(x.min(), x.max(), y.min(), y.max()),
                axes=ax, dirs=v)


def dot_contours(font, g):
    polys = K.placed_polys(font, g, 100, 0.0)
    out = []
    for poly in polys:
        p = np.asarray(poly, float)
        if len(p) > 2 and p[:, 1].min() > 600.0:
            out.append(p)
    return out


def main():
    bd, ports_path, var, out_txt = sys.argv[1:5]
    words = sys.argv[5:]
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P = json.load(open(os.path.join(bd, "join_params.json")))
    ports = G.load_ports(ports_path, var)
    lines = [f"K863 J3k: the font's dots against the build's dot strokes ({bd}); fu, u = fu x 0.24"]
    for w in words:
        A = G.assemble(font, B, P, w, with_ref=False, ports=ports)
        sh = A["shaping"]
        for lt in A["letters"]:
            if lt["ch"] not in "ij":
                continue
            g = sh[lt["i"]]
            dc = dot_contours(font, g)
            lines.append(f"{w!r} letter {lt['i']} {lt['ch']} glyph {g['name']} at x {g['x']:.2f}, body origin {lt['x']:.2f}"
                         f" (dx {lt['dx']:.2f}); font dot contours {len(dc)}")
            fs = None
            for p in dc:
                fs = poly_stats(p)
                c = fs["c"]
                lines.append(f"  font dot: centroid ({c[0]:.1f}, {c[1]:.1f}) = glyph-local ({c[0] - g['x']:.1f}, {c[1]:.1f}),"
                             f" area {fs['area']:.0f} fu^2, eq. diameter {fs['d_eq']:.1f} fu = {fs['d_eq'] * U:.2f} u,"
                             f" extents x {fs['ext'][0]:.1f}..{fs['ext'][1]:.1f} y {fs['ext'][2]:.1f}..{fs['ext'][3]:.1f},"
                             f" half-axes {fs['axes'][1]:.1f} x {fs['axes'][0]:.1f} fu along "
                             f"({fs['dirs'][0, 1]:.3f}, {fs['dirs'][1, 1]:.3f})")
            for si, st in enumerate(lt["strokes"][1:], 1):
                Ps = L.samples(st, 0.5)[0]
                ln = float(np.linalg.norm(np.diff(Ps, axis=0), axis=1).sum())
                c = Ps.mean(axis=0)
                lines.append(f"  build stroke {si}: {len(st)} cubics from ({Ps[0][0]:.1f}, {Ps[0][1]:.1f}) to "
                             f"({Ps[-1][0]:.1f}, {Ps[-1][1]:.1f}), length {ln:.1f} fu = {ln * U:.2f} u, mean point "
                             f"({c[0]:.1f}, {c[1]:.1f})"
                             + (f", offset from the font dot's centroid ({c[0] - fs['c'][0]:.1f}, {c[1] - fs['c'][1]:.1f}) fu"
                                if fs else ""))
    with open(out_txt, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
