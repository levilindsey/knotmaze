r"""K1112 Run P task 6: the overlay sheet. One cell per case: the font's fill in light grey, with every
build's drawn centreline over it on the same axes, each build in its own colour (named in the legend).
A build is named <label>=<dir>|ports|<variant>|<ports file>, as sheet_k1112p.py's columns.
Run from the trace dir:
  venv\Scripts\python.exe -I work35\dbg\overlay_k1112p.py <out.svg> <title> <cases,comma> --col <build> ..."""
import json
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import k886lib as L  # noqa: E402
import gen_k1027 as G  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
from k863lib import Font  # noqa: E402

K = L.K
S = 0.24
YTOP, YBOT = 1000.0, -560.0
COLOURS = ["#000000", "#dc2626", "#2563eb", "#7c3aed", "#059669", "#d97706"]


def bz_d(bzs, P):
    s = "M " + P(*bzs[0][0])
    for b in bzs:
        s += " C " + " ".join(P(*q) for q in b[1:])
    return s


def main():
    a = sys.argv[1:]
    cols = []
    while "--col" in a:
        i = a.index("--col")
        cols.append(a[i + 1])
        a = a[:i] + a[i + 2:]
    out_svg, title, cases = a[0], a[1], [c for c in a[2].split(",") if c]
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    builds = []
    for c in cols:
        name, spec = c.split("=", 1)
        parts = spec.split("|")
        bd = parts[0] if os.path.isabs(parts[0]) else os.path.join(T, parts[0])
        builds.append(dict(name=name, B=json.load(open(os.path.join(bd, "bodies.json"))),
                           P=json.load(open(os.path.join(bd, "join_params.json"))), mode=parts[1],
                           variant=parts[2] if len(parts) > 2 else "A",
                           ports=os.path.join(T, parts[3]) if len(parts) > 3 else None))
    cells = []
    for w in cases:
        row = []
        for b in builds:
            ports = G.load_ports(b["ports"], b["variant"]) if b["mode"] == "ports" else None
            row.append(G.assemble(font, b["B"], b["P"], w, with_ref=True, B_ref=b["B"], ports=ports))
        polys = [p for p in (K.placed_polys(font, g, 100, 0.0) for g in row[0]["shaping"]) if len(p)]
        allp = np.vstack([np.vstack(p) for p in polys])
        gp = []
        for A in row:
            gp += [np.asarray(j["gen"]) for j in A["joins"] + A["leads"] + A["tails"]]
            gp += [L.samples(s, 4.0)[0] for lt in A["letters"] for s in lt["strokes"]]
        gp = np.vstack(gp)
        cells.append(dict(case=w, row=row, polys=polys,
                          xmin=min(allp[:, 0].min(), gp[:, 0].min()) - 60,
                          xmax=max(allp[:, 0].max(), gp[:, 0].max()) + 60))
    pad, lab, gap = 30.0, 200.0, 30.0
    row_h = (YTOP - YBOT) * S + 24.0
    cw = max(c["xmax"] - c["xmin"] for c in cells) * S
    W = 2 * pad + lab + cw
    H = 140.0 + len(cells) * row_h
    legend = ", ".join(f'{b["name"]}: {COLOURS[i % len(COLOURS)]}' for i, b in enumerate(builds))
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="0 0 {W:.1f} {H:.1f}">',
           f"<title>{title}</title>", '<rect width="100%" height="100%" fill="white"/>',
           f'<text x="{pad}" y="34" font-family="sans-serif" font-size="22">{title}</text>',
           f'<text x="{pad}" y="62" font-family="sans-serif" font-size="15" fill="#444">The font (wght 100) in light '
           f'grey; each build\'s centreline over it on the same axes. {legend}. Units: 1 px = 1 u (x-height 120 u).</text>']
    for ri, c in enumerate(cells):
        oy = 140.0 + ri * row_h + YTOP * S
        ox = pad + lab - c["xmin"] * S

        def P(x, y, ox=ox, oy=oy):
            return f"{ox + x * S:.2f},{oy - y * S:.2f}"

        out.append(f'<g id="case-{ri + 1}">')
        out.append(f'<text x="{pad}" y="{oy - 60:.1f}" font-family="sans-serif" font-size="20" fill="#222">{c["case"]}</text>')
        x0 = pad + lab
        for yy, col in ((0.0, "#bfd0f0"), (500.0, "#c8e6c8")):
            out.append(f'<line x1="{x0:.1f}" x2="{x0 + cw:.1f}" y1="{oy - yy * S:.2f}" y2="{oy - yy * S:.2f}" '
                       f'stroke="{col}" stroke-width="1"/>')
        d = " ".join("M " + " L ".join(P(x, y) for x, y in np.asarray(poly, float)) + " Z"
                     for g in c["polys"] for poly in g)
        out.append(f'<path d="{d}" fill="#d9d9d9" stroke="none"/>')
        for bi, A in enumerate(c["row"]):
            col = COLOURS[bi % len(COLOURS)]
            for lt in A["letters"]:
                for st in lt["strokes"]:
                    out.append(f'<path d="{bz_d(st, P)}" fill="none" stroke="{col}" stroke-width="1.6" '
                               f'stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>')
            for nm in ("joins", "leads", "tails"):
                for j in A[nm]:
                    bz = [[list(map(float, q)) for q in b] for b in FN.conn_beziers(j["coeffs"])]
                    out.append(f'<path d="{bz_d(bz, P)}" fill="none" stroke="{col}" stroke-width="1.6" '
                               f'stroke-linecap="round" opacity="0.85"/>')
        out.append("</g>")
    out.append("</svg>")
    with open(out_svg, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))
    print(f"{out_svg}: {len(cells)} rows, builds {', '.join(b['name'] for b in builds)}")


main()
