# K1198 Run G (Muse batch 22, 22G) task 4: the ij sheet on v6.8.
# Rows: ij alone and every word of J3i's list holding ij (bench census word
# list; in practice only the word ij itself). Columns, every one labelled:
# the font's ligature (stock font, shaped normally), the font's unligated ij
# (ligature-emptied font; the cell says so if it draws none), v6.8 today
# (stock font: the hand places the ligature as one letter, no j, no join) and
# v6.8 with the rule (emptied font: i and j placed, the join solved through
# the ports, work28/ports_k990e.json variant M on v68_22g/base). Hand cells
# draw over the stock font's pale underlay. Red solved joins, blue preset.
# Writes out_22g/ij_22g.svg and ij_22g.txt; the PNG is the runner's Inkscape
# export at 48 dpi (J3i's Png dpi in checks_k863j.ps1).
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\ij_sheet_22g.py
import hashlib
import json
import os
import re
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
BENCH = os.path.join(T, "work33", "census_v68x.json")
BASE = os.path.join(KDIR, "v68_22g", "base")
PORTS = os.path.join(T, "work28", "ports_k990e.json")
STOCK = os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf")
MOD = os.path.join(KDIR, "v68_22g", "font_nolig.ttf")
OUTDIR = os.path.join(KDIR, "out_22g")


def bench_words():
    rows = json.load(open(BENCH, encoding="utf-8"))["rows"]
    by_w = {}
    for r in rows:
        m = re.match(r"w(\d+):", r["id"])
        if m:
            by_w.setdefault(int(m.group(1)), r["word"])
    return [by_w[k] for k in sorted(by_w)]


def shape_hash(coeffs):
    return hashlib.sha256(json.dumps(np.asarray(coeffs, float).tolist()).encode()).hexdigest()[:16]


def bz_d(bzs, P):
    s = "M " + P(*bzs[0][0])
    for b in bzs:
        s += " C " + " ".join(P(*q) for q in b[1:])
    return s


def glyph_polys(font, text):
    sh = K.shape(font, text, 100, L.feats_for(text))
    polys = [p for p in (K.placed_polys(font, g, 100, 0.0) for g in sh) if len(p)]
    return sh, polys


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    stock, mod = Font(STOCK), Font(MOD)
    B = json.load(open(os.path.join(BASE, "bodies.json")))
    P = json.load(open(os.path.join(BASE, "join_params.json")))
    ports = G.load_ports(PORTS, "M")
    cases = [w for w in bench_words() if "ij" in w]
    report = [f"K1198 22G ij sheet: rows {cases}; columns font ligature | font unligated | "
              f"v6.8 today | v6.8 with the rule (ports M). Red solved, blue preset."]
    cells = []
    for w in cases:
        sh_stock, polys_stock = glyph_polys(stock, w)
        sh_mod, polys_mod = glyph_polys(mod, w)
        report.append(f"{w} font stock shaping: {[(s['name'], s['cluster']) for s in sh_stock]}")
        report.append(f"{w} font nolig shaping: {[(s['name'], s['cluster']) for s in sh_mod]}")
        hands = []
        for tag, font in (("today", stock), ("rule", mod)):
            A = G.assemble(font, B, P, w, with_ref=True, B_ref=B, ports=ports)
            hands.append(A)
            for j in A["joins"]:
                if "port" in j:
                    sv = j["port"]["solve"]
                    report.append(f"{w} {tag} {j['L']}{j['R']} solved: hash {shape_hash(j['coeffs'])} "
                                  f"attach s_u {j['port']['entry']['s_u']:.4f} status {sv.get('status')} "
                                  f"side {sv.get('side_min_u')} dist {float(j['dist_u'])} cls {j['cls']}")
                else:
                    report.append(f"{w} {tag} {j['L']}{j['R']} preset {j['src']}; dist {float(j['dist_u'])}")
            if not A["joins"]:
                report.append(f"{w} {tag}: no join (letters {[(l['ch'], l['glyph']) for l in A['letters']]})")
        allp = np.vstack([np.vstack(p) for p in polys_stock]) if polys_stock else np.zeros((1, 2))
        gp = []
        for A in hands:
            gp += [np.asarray(j["gen"]) for j in A["joins"] + A["leads"] + A["tails"]]
            gp += [L.samples(s, 4.0)[0] for lt in A["letters"] for s in lt["strokes"]]
        gp = np.vstack(gp) if gp else np.zeros((1, 2))
        cells.append(dict(case=w, hands=hands, polys_stock=polys_stock, polys_mod=polys_mod,
                          xmin=min(allp[:, 0].min(), gp[:, 0].min()) - 60,
                          xmax=max(allp[:, 0].max(), gp[:, 0].max()) + 60))
    YTOP, YBOT = 1000.0, -560.0
    pad, lab, gap = 30.0, 200.0, 30.0
    row_h = (YTOP - YBOT) * S + 24.0
    cw = max(c["xmax"] - c["xmin"] for c in cells) * S
    cols = ["font ligature", "font unligated", "v6.8 today", "v6.8 with rule"]
    ncol = 4
    W = 2 * pad + lab + ncol * cw + (ncol - 1) * gap
    H = 150.0 + len(cells) * row_h
    title = "K1198 Run G (22G): i and j in ij on v6.8 — font ligature, font unligated, hand today, hand with the rule"
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="0 0 {W:.1f} {H:.1f}">',
           f"<title>{title}</title>", '<rect width="100%" height="100%" fill="white"/>',
           f'<text x="{pad}" y="34" font-family="sans-serif" font-size="22">{title}</text>',
           f'<text x="{pad}" y="62" font-family="sans-serif" font-size="15" fill="#444">Rule: calt kept, GSUB type-4 '
           f'ligature lookups emptied; no per-pair data. Black bodies, red solved joins, orange tails. 1 px = 1 u.</text>']
    for ci, nm in enumerate(cols):
        x = pad + lab + ci * (cw + gap)
        out.append(f'<text x="{x:.1f}" y="96" font-family="sans-serif" font-size="20" font-weight="bold">{nm}</text>')
    for ri, c in enumerate(cells):
        oy = 150.0 + ri * row_h + YTOP * S
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
            if ci in (0, 1):
                polys = c["polys_stock"] if ci == 0 else c["polys_mod"]
                if polys:
                    d = " ".join("M " + " L ".join(P(x, y) for x, y in np.asarray(poly, float)) + " Z"
                                 for g in polys for poly in g)
                    out.append(f'<path d="{d}" fill="#bdbdbd" stroke="none"/>')
                else:
                    out.append(f'<text x="{x0 + 10:.1f}" y="{oy - 100:.1f}" font-family="sans-serif" '
                               f'font-size="18" fill="#b91c1c">font draws no unligated ij</text>')
                continue
            d = " ".join("M " + " L ".join(P(x, y) for x, y in np.asarray(poly, float)) + " Z"
                         for g in c["polys_stock"] for poly in g)
            out.append(f'<path d="{d}" fill="#ececec" stroke="none"/>')
            A = c["hands"][ci - 2]
            if not A["letters"]:
                out.append(f'<text x="{x0 + 10:.1f}" y="{oy - 100:.1f}" font-family="sans-serif" '
                           f'font-size="18" fill="#b91c1c">hand cannot draw this cell</text>')
                continue
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
            if ci == 2 and not A["joins"]:
                out.append(f'<text x="{x0 + 10:.1f}" y="{oy + 90:.1f}" font-family="sans-serif" '
                           f'font-size="16" fill="#b91c1c">hand draws i only: no j, no join (ligature)</text>')
        out.append("</g>")
    out.append("</svg>")
    svg = os.path.join(OUTDIR, "ij_22g.svg")
    with open(svg, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(out) + "\n")
    with open(os.path.join(OUTDIR, "ij_22g.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(report) + "\n")
    print(f"{svg}: {len(cells)} rows x {ncol} columns")
    print("\n".join(report))


if __name__ == "__main__":
    main()
