# K1198 Run G (21G) task 3 sheet: the joins the ligatures hid, beside the font.
# The only hidden join is ij (ligature_21g.py: calt, ij.jmc). Generated columns shape
# with calt off for every word (k886lib.feats_for wrapped, no per-pair data) and solve
# through the ports under Plc1m and v7.2; the font column shapes normally, so its ij
# cell is the ligature itself. Controls ii/aj/ji (20G's ij_diag controls) ride along,
# labelled as controls. Read-only kit inputs; writes ij_Plc1m.svg/.txt beside it.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\ij_sheet_21g.py
import hashlib
import json
import os
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
os.environ["K926_FINAL_E"] = "shear"
os.environ.pop("K1009_PINS", None)
import numpy as np  # noqa: E402
import k886lib as L  # noqa: E402
import gen_k1027 as G  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
from k863lib import Font  # noqa: E402

K = L.K
S = 0.24
_orig = L.feats_for


def feats_off(text):
    f = dict(_orig(text))
    f["calt"] = False
    return f


def shape_hash(coeffs):
    return hashlib.sha256(json.dumps(np.asarray(coeffs, float).tolist()).encode()).hexdigest()[:16]


def bz_d(bzs, P):
    s = "M " + P(*bzs[0][0])
    for b in bzs:
        s += " C " + " ".join(P(*q) for q in b[1:])
    return s


def main():
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    hands = []
    for name, base, ports_path, variant in (
            ("Plc1m", "work31/base", os.path.join(KDIR, "ports_k1112cusp.json"), "Plc1m"),
            ("v7.2", "work32/base", os.path.join(T, "work32", "ports_k1112cusp.json"), "Plc2m")):
        B = json.load(open(os.path.join(T, base, "bodies.json")))
        P = json.load(open(os.path.join(T, base, "join_params.json")))
        hands.append((name, B, P, G.load_ports(ports_path, variant)))
    cases = ["ij", "ii", "aj", "ji"]
    report = ["K1198 Run G (21G) hidden-join sheet: calt off everywhere for generated columns; "
              "font column shaped normally (ij = ij.jmc ligature). Red solved, blue preset."]
    cells = []
    L.feats_for = feats_off
    try:
        for w in cases:
            # font, shaped normally for the underlay and the font column
            sh_font = K.shape(font, w, 100, _orig(w))
            polys = [p for p in (K.placed_polys(font, g, 100, 0.0) for g in sh_font) if len(p)]
            row = []
            for name, B, P, ports in hands:
                A = G.assemble(font, B, P, w, with_ref=True, B_ref=B, ports=ports)
                row.append(A)
                for j in A["joins"]:
                    if "port" in j:
                        sv = j["port"]["solve"]
                        report.append(f"{w} {name} {j['L']}{j['R']} solved: hash {shape_hash(j['coeffs'])} "
                                      f"attach s_u {j['port']['entry']['s_u']:.4f} exit_from_end "
                                      f"{j['port']['exit']['from_end_u']:.4f} status {sv.get('status')} "
                                      f"nfev {sv.get('nfev')} side {sv.get('side_min_u')} "
                                      f"dist {float(j['dist_u'])} shaping_off "
                                      f"{[(s['name'], s['cluster']) for s in A['shaping']]}")
                    else:
                        report.append(f"{w} {name} {j['L']}{j['R']} preset {j['src']}; dist "
                                      f"{float(j['dist_u'])} shaping_off "
                                      f"{[(s['name'], s['cluster']) for s in A['shaping']]}")
                if not A["joins"]:
                    report.append(f"{w} {name}: no join (letters "
                                  f"{[(l['ch'], l['glyph']) for l in A['letters']]})")
            report.append(f"{w} font shaping (normal): {[(s['name'], s['cluster']) for s in sh_font]}")
            allp = np.vstack([np.vstack(p) for p in polys]) if polys else np.zeros((1, 2))
            gp = []
            for A in row:
                gp += [np.asarray(j["gen"]) for j in A["joins"] + A["leads"] + A["tails"]]
                gp += [L.samples(s, 4.0)[0] for lt in A["letters"] for s in lt["strokes"]]
            gp = np.vstack(gp)
            cells.append(dict(case=w, row=row, polys=polys,
                              xmin=min(allp[:, 0].min(), gp[:, 0].min()) - 60,
                              xmax=max(allp[:, 0].max(), gp[:, 0].max()) + 60))
    finally:
        L.feats_for = _orig
    YTOP, YBOT = 1000.0, -560.0
    pad, lab, gap = 30.0, 200.0, 30.0
    row_h = (YTOP - YBOT) * S + 24.0
    cw = max(c["xmax"] - c["xmin"] for c in cells) * S
    ncol = 1 + len(hands)
    W = 2 * pad + lab + ncol * cw + (ncol - 1) * gap
    H = 110.0 + len(cells) * row_h
    title = "K1198 Run G (21G): the join calt hid (ij), font | Plc1m calt-off | v7.2 calt-off; ii/aj/ji controls"
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="0 0 {W:.1f} {H:.1f}">',
           f"<title>{title}</title>", '<rect width="100%" height="100%" fill="white"/>',
           f'<text x="{pad}" y="34" font-family="sans-serif" font-size="22">{title}</text>',
           f'<text x="{pad}" y="62" font-family="sans-serif" font-size="15" fill="#444">Font shaped normally; '
           f'generated columns shape with calt off everywhere and solve through the ports. Black bodies, '
           f'red solved joins, blue preset joins, orange leads/tails. 1 px = 1 u.</text>']
    for ci, nm in enumerate(["font"] + [h[0] for h in hands]):
        x = pad + lab + ci * (cw + gap)
        out.append(f'<text x="{x:.1f}" y="96" font-family="sans-serif" font-size="20" font-weight="bold">{nm}</text>')
    for ri, c in enumerate(cells):
        oy = 110.0 + ri * row_h + YTOP * S
        out.append(f'<g id="case-{ri + 1}">')
        out.append(f'<text x="{pad}" y="{oy - 60:.1f}" font-family="sans-serif" font-size="20" fill="#222">'
                   f'{c["case"]}</text>')
        for ci in range(ncol):
            ox = pad + lab + ci * (cw + gap) - c["xmin"] * S

            def P(x, y, ox=ox, oy=oy):
                return f"{ox + x * S:.2f},{oy - y * S:.2f}"
            x0 = pad + lab + ci * (cw + gap)
            for yy, col in ((0.0, "#bfd0f0"), (500.0, "#c8e6c8")):
                out.append(f'<line x1="{x0:.1f}" x2="{x0 + cw:.1f}" y1="{oy - yy * S:.2f}" y2="{oy - yy * S:.2f}" '
                           f'stroke="{col}" stroke-width="1"/>')
            d = " ".join("M " + " L ".join(P(x, y) for x, y in np.asarray(poly, float)) + " Z"
                         for g in c["polys"] for poly in g)
            out.append(f'<path d="{d}" fill="{"#bdbdbd" if ci == 0 else "#ececec"}" stroke="none"/>')
            if ci == 0:
                continue
            A = c["row"][ci - 1]
            for lt in A["letters"]:
                for st in lt["strokes"]:
                    out.append(f'<path d="{bz_d(st, P)}" fill="none" stroke="#000" stroke-width="2.2" '
                               f'stroke-linecap="round" stroke-linejoin="round"/>')
            for nm, col in (("joins", None), ("leads", "#f97316"), ("tails", "#f97316")):
                for j in A[nm]:
                    cc = col or ("#dc2626" if "port" in j else "#2563eb")
                    bz = [[list(map(float, q)) for q in b] for b in FN.conn_beziers(j["coeffs"])]
                    out.append(f'<path d="{bz_d(bz, P)}" fill="none" stroke="{cc}" stroke-width="2.2" '
                               f'stroke-linecap="round"/>')
        out.append("</g>")
    out.append("</svg>")
    svg = os.path.join(KDIR, "ij_Plc1m.svg")
    with open(svg, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(out) + "\n")
    with open(os.path.join(KDIR, "ij_Plc1m.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(report) + "\n")
    print(f"{svg}: {len(cells)} rows x {ncol} columns")
    print("\n".join(report))


if __name__ == "__main__":
    main()
